import { describe, expect, it } from "vitest";
import {
  buildTldr,
  TLDR_NOTE,
} from "../../../../src/modules/report/support/tldr.js";
import {
  makeGate,
  makeRecommendation,
  makeResult,
  makeStages,
} from "../../../helpers/results.js";

describe("buildTldr", () => {
  it("returns the current score and grade", () => {
    const tldr = buildTldr(makeResult({ overallScore: 59, grade: "F" }));
    expect(tldr.score).toBe(59);
    expect(tldr.grade).toBe("F");
  });

  it("carries the non-additive audit points note", () => {
    const tldr = buildTldr(makeResult());
    expect(tldr.note).toBe(TLDR_NOTE);
    expect(tldr.note).toContain("not additive");
  });

  it("selects the top 3 fixes by priority then audit points", () => {
    const result = makeResult({
      recommendations: [
        makeRecommendation({
          factor: "Low Priority Big Points",
          priority: "low",
          auditPoints: 40,
        }),
        makeRecommendation({
          factor: "High Priority Small Points",
          priority: "high",
          auditPoints: 3,
        }),
        makeRecommendation({
          factor: "High Priority Big Points",
          priority: "high",
          auditPoints: 12,
        }),
        makeRecommendation({
          factor: "Medium Priority",
          priority: "medium",
          auditPoints: 8,
        }),
      ],
    });

    const tldr = buildTldr(result);

    expect(tldr.topFixes).toHaveLength(3);
    expect(tldr.topFixes[0].factor).toBe("High Priority Big Points");
    expect(tldr.topFixes[1].factor).toBe("High Priority Small Points");
    expect(tldr.topFixes[2].factor).toBe("Medium Priority");
  });

  it("exposes factor, category, and auditPoints on each fix", () => {
    const result = makeResult({
      recommendations: [
        makeRecommendation({
          factor: "Author Attribution",
          category: "Authority Context",
          priority: "high",
          auditPoints: 10,
        }),
      ],
    });

    const tldr = buildTldr(result);

    expect(tldr.topFixes[0]).toEqual({
      factor: "Author Attribution",
      category: "Authority Context",
      auditPoints: 10,
    });
  });

  it("defaults auditPoints to zero for recommendations without points", () => {
    const result = makeResult({
      recommendations: [makeRecommendation({ auditPoints: undefined })],
    });

    const tldr = buildTldr(result);

    expect(tldr.topFixes[0].auditPoints).toBe(0);
  });

  it("returns no fixes when there are no recommendations", () => {
    const tldr = buildTldr(makeResult({ recommendations: [] }));
    expect(tldr.topFixes).toHaveLength(0);
  });

  it("omits stages when the result carries none", () => {
    const tldr = buildTldr(makeResult({ stages: undefined }));
    expect(tldr.stages).toBeUndefined();
  });

  it("summarizes stage percentages and eligibility status", () => {
    const tldr = buildTldr(makeResult({ stages: makeStages() }));

    expect(tldr.stages).toEqual({
      technicalEligibility: { status: "pass", pct: 87 },
      retrievalAlignment: { pct: 75 },
      citationFitness: { pct: 64, uncappedPct: 64, trippedGates: [] },
      provenance: { pct: 73 },
    });
  });

  it("names tripped gates and preserves the uncapped percentage", () => {
    const stages = makeStages();
    const tldr = buildTldr(
      makeResult({
        stages: {
          ...stages,
          citationFitness: {
            ...stages.citationFitness,
            pct: 50,
            uncappedPct: 82,
            gates: [
              makeGate({ status: "tripped" }),
              makeGate({
                id: "missingPriceProduct",
                label: "Product page without price information",
                capPct: 60,
                status: "not_applicable",
              }),
            ],
          },
        },
      }),
    );

    expect(tldr.stages?.citationFitness).toEqual({
      pct: 50,
      uncappedPct: 82,
      trippedGates: ["Visible date is stale"],
    });
  });

  it("never exposes projected scores or expected gains", () => {
    const tldr = buildTldr(makeResult());
    const serialized = JSON.stringify(tldr);
    expect(serialized).not.toContain("projectedScore");
    expect(serialized).not.toContain("projectedGrade");
    expect(serialized).not.toContain("expectedGain");
    expect(serialized).not.toContain("quickestWins");
  });
});
