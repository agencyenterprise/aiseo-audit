import { describe, expect, it } from "vitest";
import type {
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

function makeAuditResult(
  categories: Record<string, CategoryResultType>,
): AuditResultType {
  return {
    categories: categories as Record<CategoryNameType, CategoryResultType>,
    rawData: { title: "Test", metaDescription: "", wordCount: 0 },
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
