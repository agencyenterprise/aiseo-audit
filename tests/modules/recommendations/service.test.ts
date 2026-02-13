import { describe, expect, it } from "vitest";
import type {
  AuditRawDataType,
  AuditResultType,
  CategoryNameType,
  CategoryResultType,
  FactorResultType,
} from "../../../src/modules/audits/schema.js";
import { generateRecommendations } from "../../../src/modules/recommendations/service.js";

function makeFactor(
  name: string,
  score: number,
  maxScore: number,
): FactorResultType {
  return {
    name,
    score,
    maxScore,
    value: `${score}/${maxScore}`,
    status: score / maxScore >= 0.7 ? "good" : "needs_improvement",
  };
}

function makeCategory(
  name: string,
  key: CategoryNameType,
  factors: FactorResultType[],
): CategoryResultType {
  const score = factors.reduce((sum, f) => sum + f.score, 0);
  const maxScore = factors.reduce((sum, f) => sum + f.maxScore, 0);
  return { name, key, score, maxScore, factors };
}

const DEFAULT_RAW_DATA: AuditRawDataType = {
  title: "Test",
  metaDescription: "",
  wordCount: 500,
};

function makeAuditResult(
  categories: Record<string, CategoryResultType>,
  rawData?: Partial<AuditRawDataType>,
): AuditResultType {
  return {
    categories: categories as Record<CategoryNameType, CategoryResultType>,
    rawData: { ...DEFAULT_RAW_DATA, ...rawData },
  };
}

describe("generateRecommendations", () => {
  it("generates no recommendations for perfect scores", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 100, 100),
        makeFactor("Headings", 80, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs.length).toBe(0);
  });

  it("generates recommendations for low scores", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 20, 100),
        makeFactor("Headings", 50, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs.length).toBe(2);
  });

  it("assigns high priority for <30%", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 10, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].priority).toBe("high");
  });

  it("assigns medium priority for 30-49%", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 40, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].priority).toBe("medium");
  });

  it("assigns low priority for 50-69%", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 60, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].priority).toBe("low");
  });

  it("sorts recommendations by priority then by name", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Zebra Factor", 60, 100),
        makeFactor("Alpha Factor", 10, 100),
        makeFactor("Beta Factor", 40, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].factor).toBe("Alpha Factor");
    expect(recs[0].priority).toBe("high");
    expect(recs[1].factor).toBe("Beta Factor");
    expect(recs[1].priority).toBe("medium");
    expect(recs[2].factor).toBe("Zebra Factor");
    expect(recs[2].priority).toBe("low");
  });

  it("includes category name in recommendation", () => {
    const auditResult = makeAuditResult({
      authority: makeCategory("Authority Context", "authorityContext", [
        makeFactor("Author Attribution", 0, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].category).toBe("Authority Context");
  });

  it("includes current value in recommendation", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 50, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].currentValue).toBe("50/100");
  });

  it("handles multiple categories", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 30, 100),
      ]),
      authority: makeCategory("Authority", "authorityContext", [
        makeFactor("Author", 10, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs.length).toBe(2);
    const categories = recs.map((r) => r.category);
    expect(categories).toContain("Content");
    expect(categories).toContain("Authority");
  });

  it("handles empty audit result", () => {
    const auditResult = makeAuditResult({});

    const recs = generateRecommendations(auditResult);

    expect(recs.length).toBe(0);
  });

  it("skips factors at exactly 70%", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 70, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs.length).toBe(0);
  });
});

describe("context-aware recommendations", () => {
  it("includes actual word count in Word Count Adequacy", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("Word Count Adequacy", 2, 12),
        ]),
      },
      { wordCount: 87 },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("87 words");
  });

  it("names blocked crawlers in AI Crawler Access", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("AI Crawler Access", 3, 10),
        ]),
      },
      {
        crawlerAccess: {
          blocked: ["GPTBot", "ClaudeBot"],
          allowed: ["PerplexityBot"],
          unknown: [],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("GPTBot");
    expect(recs[0].recommendation).toContain("ClaudeBot");
    expect(recs[0].recommendation).toContain("PerplexityBot");
  });

  it("includes image counts in Image Accessibility", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("Image Accessibility", 3, 8),
        ]),
      },
      {
        imageAccessibility: {
          imageCount: 12,
          imagesWithAlt: 3,
          figcaptionCount: 0,
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("3 of your 12 images");
    expect(recs[0].recommendation).toContain("25%");
  });

  it("includes section length average in Section Length", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentStructure", [
          makeFactor("Section Length", 4, 12),
        ]),
      },
      {
        sectionLengths: {
          sectionCount: 5,
          avgWordsPerSection: 312,
          sections: [250, 300, 350, 280, 380],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("312 words");
    expect(recs[0].recommendation).toContain("120-180");
  });

  it("includes capsule counts in Answer Capsules", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "answerability", [
          makeFactor("Answer Capsules", 2, 13),
        ]),
      },
      {
        answerCapsules: { total: 5, withCapsule: 1 },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("1 of your 5");
    expect(recs[0].recommendation).toContain("remaining 4");
  });

  it("includes freshness age in Content Freshness", () => {
    const auditResult = makeAuditResult(
      {
        authority: makeCategory("Authority", "authorityContext", [
          makeFactor("Content Freshness", 2, 12),
        ]),
      },
      {
        freshness: {
          publishDate: "2024-01-01",
          modifiedDate: null,
          ageInMonths: 25,
          hasModifiedDate: false,
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("25 months");
  });

  it("lists missing schema properties in Schema Completeness", () => {
    const auditResult = makeAuditResult(
      {
        authority: makeCategory("Authority", "authorityContext", [
          makeFactor("Schema Completeness", 4, 10),
        ]),
      },
      {
        schemaCompleteness: {
          totalTypes: 1,
          avgCompleteness: 0.33,
          details: [
            {
              type: "Article",
              present: ["headline"],
              missing: ["author", "datePublished"],
            },
          ],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("Article");
    expect(recs[0].recommendation).toContain("author");
    expect(recs[0].recommendation).toContain("datePublished");
  });

  it("includes sentence length average", () => {
    const auditResult = makeAuditResult(
      {
        readability: makeCategory("Readability", "readabilityForCompression", [
          makeFactor("Sentence Length", 5, 15),
        ]),
      },
      { avgSentenceLength: 34 },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("34 words");
    expect(recs[0].recommendation).toContain("12-22");
  });

  it("includes Flesch score in Readability", () => {
    const auditResult = makeAuditResult(
      {
        readability: makeCategory("Readability", "readabilityForCompression", [
          makeFactor("Readability", 6, 15),
        ]),
      },
      { readabilityScore: 38 },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("38");
    expect(recs[0].recommendation).toContain("difficult");
  });

  it("includes entity name in Entity Consistency", () => {
    const auditResult = makeAuditResult(
      {
        authority: makeCategory("Authority", "authorityContext", [
          makeFactor("Entity Consistency", 2, 10),
        ]),
      },
      {
        entityConsistency: {
          entityName: "Acme Corp",
          surfacesFound: 1,
          surfacesChecked: 4,
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("Acme Corp");
    expect(recs[0].recommendation).toContain("1 of 4");
  });

  it("includes entity breakdown in Entity Richness", () => {
    const auditResult = makeAuditResult(
      {
        entity: makeCategory("Entity", "entityClarity", [
          makeFactor("Entity Richness", 7, 20),
        ]),
      },
      {
        entities: {
          people: ["John"],
          organizations: ["Acme"],
          places: [],
          topics: ["SEO", "AI"],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("4 unique entities");
    expect(recs[0].recommendation).toContain("1 people");
    expect(recs[0].recommendation).toContain("1 organizations");
    expect(recs[0].recommendation).toContain("2 topics");
  });

  it("includes external link count in External References", () => {
    const auditResult = makeAuditResult(
      {
        grounding: makeCategory("Grounding", "groundingSignals", [
          makeFactor("External References", 6, 13),
        ]),
      },
      {
        externalLinks: [
          { url: "https://example.com", text: "Example" },
          { url: "https://other.com", text: "Other" },
        ],
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("2 external links");
  });

  it("falls back gracefully when rawData field is missing", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("AI Crawler Access", 0, 10),
        ]),
      },
      {},
    );

    const recs = generateRecommendations(auditResult);

    expect(recs.length).toBe(1);
    expect(recs[0].recommendation).toBeTruthy();
  });
});
