import { describe, expect, it } from "vitest";
import type { AnalyzerResultType } from "../../../src/modules/analyzer/schema.js";
import { computeDiff } from "../../../src/modules/diff/service.js";

function makeResult(
  overallScore: number,
  categoryOverrides: Record<string, { score: number; maxScore: number }> = {},
): AnalyzerResultType {
  const defaultCategories = {
    contentExtractability: {
      name: "Content Extractability",
      key: "contentExtractability" as const,
      score: 50,
      maxScore: 60,
      factors: [],
    },
    authorityContext: {
      name: "Authority Context",
      key: "authorityContext" as const,
      score: 20,
      maxScore: 40,
      factors: [],
    },
  };

  const categories = Object.fromEntries(
    Object.entries(defaultCategories).map(([key, cat]) => {
      const override = categoryOverrides[key];
      return [
        key,
        override
          ? { ...cat, score: override.score, maxScore: override.maxScore }
          : cat,
      ];
    }),
  );

  return {
    url: "https://example.com",
    signalsBase: "https://example.com",
    analyzedAt: "2026-04-17T00:00:00Z",
    overallScore,
    grade: overallScore >= 90 ? "A" : overallScore >= 70 ? "B" : "D",
    totalPoints: 0,
    maxPoints: 100,
    categories,
    recommendations: [],
    rawData: { title: "", metaDescription: "", wordCount: 0 },
    meta: { version: "1.5.0", analysisDurationMs: 0 },
  };
}

describe("computeDiff", () => {
  it("reports zero deltas when current equals baseline", () => {
    const current = makeResult(72);
    const baseline = makeResult(72);

    const diff = computeDiff(current, baseline);

    expect(diff.overallDelta).toBe(0);
    expect(diff.categoryDeltas.contentExtractability.delta).toBe(0);
  });

  it("reports a positive overall delta when the score improved", () => {
    const current = makeResult(78);
    const baseline = makeResult(70);

    const diff = computeDiff(current, baseline);

    expect(diff.overallDelta).toBe(8);
  });

  it("reports a negative overall delta when the score regressed", () => {
    const current = makeResult(60);
    const baseline = makeResult(72);

    const diff = computeDiff(current, baseline);

    expect(diff.overallDelta).toBe(-12);
  });

  it("reports per-category score deltas keyed by category key", () => {
    const current = makeResult(70, {
      contentExtractability: { score: 55, maxScore: 60 },
    });
    const baseline = makeResult(70, {
      contentExtractability: { score: 50, maxScore: 60 },
    });

    const diff = computeDiff(current, baseline);

    expect(diff.categoryDeltas.contentExtractability.delta).toBe(5);
    expect(diff.categoryDeltas.contentExtractability.name).toBe(
      "Content Extractability",
    );
  });

  it("exposes current and baseline scores on the diff", () => {
    const current = makeResult(82);
    const baseline = makeResult(75);

    const diff = computeDiff(current, baseline);

    expect(diff.currentScore).toBe(82);
    expect(diff.baselineScore).toBe(75);
  });

  it("exposes current and baseline timestamps", () => {
    const current = { ...makeResult(82), analyzedAt: "2026-04-17T00:00:00Z" };
    const baseline = { ...makeResult(75), analyzedAt: "2026-04-10T00:00:00Z" };

    const diff = computeDiff(current, baseline);

    expect(diff.currentAnalyzedAt).toBe("2026-04-17T00:00:00Z");
    expect(diff.baselineAnalyzedAt).toBe("2026-04-10T00:00:00Z");
  });

  it("handles categories that exist in one result but not the other", () => {
    const current = makeResult(70);
    const baseline = makeResult(70);
    // Remove one category from baseline
    delete (baseline as { categories: Record<string, unknown> }).categories
      .authorityContext;

    const diff = computeDiff(current, baseline);

    expect(diff.categoryDeltas.authorityContext.delta).toBe(20);
    expect(diff.categoryDeltas.authorityContext.baselineScore).toBe(0);
  });
});
