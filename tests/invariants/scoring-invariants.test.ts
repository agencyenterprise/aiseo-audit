import { describe, expect, it } from "vitest";
import type {
  CategoryResultType,
  FactorResultType,
} from "../../src/modules/audits/schema.js";
import { FACTOR_REGISTRY } from "../../src/modules/audits/stage.js";
import { FACTOR_NAMES_BY_CATEGORY } from "../../src/modules/audits/factor-names.js";
import { ELIGIBILITY_FAIL_CAP } from "../../src/modules/scoring/constants.js";
import {
  computeScore,
  makeDiagnostic,
  maxFactors,
  sumFactors,
} from "../../src/modules/scoring/service.js";
import { computeStages } from "../../src/modules/scoring/stages.js";
import { DEFAULT_WEIGHTS } from "../../src/modules/config/schema.js";

const scorableFactor = (
  overrides: Partial<FactorResultType> = {},
): FactorResultType => ({
  name: "Fetch Success",
  score: 10,
  maxScore: 12,
  value: "HTTP 200",
  status: "good",
  evidence: "supported",
  citations: [],
  ...overrides,
});

const category = (
  key: CategoryResultType["key"],
  factors: FactorResultType[],
): CategoryResultType => ({
  name: key,
  key,
  score: sumFactors(factors),
  maxScore: maxFactors(factors),
  factors,
});

describe("denominator exclusion", () => {
  it("excludes neutral factors from score and maxScore", () => {
    const factors = [
      scorableFactor(),
      scorableFactor({
        name: "Tables Presence",
        score: 0,
        maxScore: 8,
        status: "neutral",
      }),
    ];

    expect(sumFactors(factors)).toBe(10);
    expect(maxFactors(factors)).toBe(12);
  });

  it("excludes diagnostic-tier factors from score and maxScore", () => {
    const factors = [
      scorableFactor(),
      scorableFactor({
        name: "Lists Presence",
        score: 11,
        maxScore: 11,
        evidence: "diagnostic",
      }),
    ];

    expect(sumFactors(factors)).toBe(10);
    expect(maxFactors(factors)).toBe(12);
  });

  it("excludes info-status diagnostics produced by makeDiagnostic", () => {
    const diagnostic = makeDiagnostic("Word Count Adequacy", "850 words");

    expect(diagnostic.status).toBe("info");
    expect(diagnostic.maxScore).toBe(0);
    expect(maxFactors([scorableFactor(), diagnostic])).toBe(12);
  });

  it("renormalizes weights over categories that still have scorable points", () => {
    const categories = {
      contentExtractability: category("contentExtractability", [
        scorableFactor({ score: 12 }),
      ]),
      entityClarity: category("entityClarity", [
        scorableFactor({
          name: "Entity Richness",
          score: 0,
          maxScore: 20,
          status: "neutral",
        }),
      ]),
    };

    const summary = computeScore(categories, DEFAULT_WEIGHTS);

    expect(summary.overallScore).toBe(100);
  });
});

describe("stage computation", () => {
  it("assigns every registered factor to a stage", () => {
    const allFactorNames = Object.values(FACTOR_NAMES_BY_CATEGORY).flat();

    for (const name of allFactorNames) {
      expect(FACTOR_REGISTRY[name]).toBeDefined();
      expect(FACTOR_REGISTRY[name].stage).toMatch(
        /^(technicalEligibility|retrievalAlignment|citationFitness|provenance)$/,
      );
    }
  });

  it("reports stage percentages within 0 to 100", () => {
    const categories = {
      contentExtractability: category("contentExtractability", [
        scorableFactor({ score: 6 }),
      ]),
      groundingSignals: category("groundingSignals", [
        scorableFactor({ name: "Citation Patterns", score: 9, maxScore: 13 }),
      ]),
    };

    const stages = computeStages(categories, {});

    for (const stage of Object.values(stages)) {
      if (stage.pct !== null) {
        expect(stage.pct).toBeGreaterThanOrEqual(0);
        expect(stage.pct).toBeLessThanOrEqual(100);
      }
    }
  });

  it("fails eligibility and suppresses downstream stages when a blocking factor is critical", () => {
    const categories = {
      contentExtractability: category("contentExtractability", [
        scorableFactor({ score: 0, status: "critical" }),
      ]),
      groundingSignals: category("groundingSignals", [
        scorableFactor({ name: "Citation Patterns", score: 13, maxScore: 13 }),
      ]),
    };

    const stages = computeStages(categories, {});

    expect(stages.technicalEligibility.status).toBe("fail");
    expect(stages.technicalEligibility.blockers).toContain("Fetch Success");
    expect(stages.citationFitness.suppressed).toBe(true);
    expect(stages.citationFitness.pct).toBeNull();
  });

  it("caps overallScore when eligibility fails", () => {
    const categories = {
      contentExtractability: category("contentExtractability", [
        scorableFactor({ score: 0, status: "critical" }),
      ]),
      groundingSignals: category("groundingSignals", [
        scorableFactor({ name: "Citation Patterns", score: 13, maxScore: 13 }),
      ]),
    };
    const stages = computeStages(categories, {});

    const summary = computeScore(categories, DEFAULT_WEIGHTS, { stages });

    expect(summary.overallScore).toBeLessThanOrEqual(ELIGIBILITY_FAIL_CAP);
    expect(summary.grade).toBe("F");
  });
});

describe("citation gates", () => {
  const healthyCitationCategories = () => ({
    groundingSignals: category("groundingSignals", [
      scorableFactor({ name: "Citation Patterns", score: 13, maxScore: 13 }),
    ]),
  });

  it("caps the citationFitness stage when a product page shows a stale date", () => {
    const stages = computeStages(
      healthyCitationCategories(),
      {
        freshness: {
          publishDate: "2019-01-01",
          modifiedDate: null,
          ageInMonths: 91,
          hasModifiedDate: false,
        },
      },
      { domain: "product" },
    );

    const staleGate = stages.citationFitness.gates.find(
      (gate) => gate.id === "staleVisibleDate",
    );
    expect(staleGate?.status).toBe("tripped");
    expect(stages.citationFitness.uncappedPct).toBe(100);
    expect(stages.citationFitness.pct).toBe(50);
  });

  it("passes the stale-date gate for recent product content", () => {
    const stages = computeStages(
      healthyCitationCategories(),
      {
        freshness: {
          publishDate: "2026-06-01",
          modifiedDate: null,
          ageInMonths: 2,
          hasModifiedDate: false,
        },
      },
      { domain: "product" },
    );

    const staleGate = stages.citationFitness.gates.find(
      (gate) => gate.id === "staleVisibleDate",
    );
    expect(staleGate?.status).toBe("pass");
    expect(stages.citationFitness.pct).toBe(100);
  });

  it("leaves the stale-date gate not applicable on informational pages", () => {
    const stages = computeStages(healthyCitationCategories(), {
      freshness: {
        publishDate: "2019-01-01",
        modifiedDate: null,
        ageInMonths: 91,
        hasModifiedDate: false,
      },
    });

    const staleGate = stages.citationFitness.gates.find(
      (gate) => gate.id === "staleVisibleDate",
    );
    expect(staleGate?.status).toBe("not_applicable");
    expect(stages.citationFitness.pct).toBe(100);
  });

  it("trips the off-topic gate only when every query lacks coverage", () => {
    const offTopic = computeStages(
      healthyCitationCategories(),
      {
        queryAlignment: {
          queries: [
            {
              query: "a",
              structuralCoverage: 0.1,
              bodyCoverage: 0.05,
              matchedTerms: [],
              missingTerms: ["a"],
            },
            {
              query: "b",
              structuralCoverage: 0.0,
              bodyCoverage: 0.1,
              matchedTerms: [],
              missingTerms: ["b"],
            },
          ],
        },
      },
      { queries: ["a", "b"] },
    );

    const onTopic = computeStages(
      healthyCitationCategories(),
      {
        queryAlignment: {
          queries: [
            {
              query: "a",
              structuralCoverage: 0.8,
              bodyCoverage: 0.9,
              matchedTerms: ["a"],
              missingTerms: [],
            },
          ],
        },
      },
      { queries: ["a"] },
    );

    expect(
      offTopic.citationFitness.gates.find((g) => g.id === "offTopicForQueries")
        ?.status,
    ).toBe("tripped");
    expect(
      onTopic.citationFitness.gates.find((g) => g.id === "offTopicForQueries")
        ?.status,
    ).toBe("pass");
  });

  it("trips the missing-price gate only on product pages without price signals", () => {
    const missingPrice = computeStages(
      healthyCitationCategories(),
      { priceSignals: { found: false, source: "none" } },
      { domain: "product" },
    );
    const withPrice = computeStages(
      healthyCitationCategories(),
      { priceSignals: { found: true, source: "json-ld" } },
      { domain: "product" },
    );
    const informational = computeStages(
      healthyCitationCategories(),
      { priceSignals: { found: false, source: "none" } },
      { domain: "informational" },
    );

    expect(
      missingPrice.citationFitness.gates.find(
        (g) => g.id === "missingPriceProduct",
      )?.status,
    ).toBe("tripped");
    expect(
      withPrice.citationFitness.gates.find(
        (g) => g.id === "missingPriceProduct",
      )?.status,
    ).toBe("pass");
    expect(
      informational.citationFitness.gates.find(
        (g) => g.id === "missingPriceProduct",
      )?.status,
    ).toBe("not_applicable");
  });
});

describe("crawler eligibility blocker", () => {
  const healthyCategories = () => ({
    contentExtractability: category("contentExtractability", [
      scorableFactor({ score: 12 }),
    ]),
  });

  it("does not fail eligibility when one crawler is blocked and the rest are unknown", () => {
    const stages = computeStages(healthyCategories(), {
      crawlerAccess: {
        allowed: [],
        blocked: ["GPTBot"],
        unknown: ["ClaudeBot", "PerplexityBot"],
      },
    });

    expect(stages.technicalEligibility.status).toBe("pass");
  });

  it("fails eligibility when every known crawler is blocked", () => {
    const stages = computeStages(healthyCategories(), {
      crawlerAccess: {
        allowed: [],
        blocked: ["GPTBot", "ClaudeBot", "PerplexityBot"],
        unknown: [],
      },
    });

    expect(stages.technicalEligibility.status).toBe("fail");
    expect(stages.technicalEligibility.blockers).toContain("AI Crawler Access");
  });
});
