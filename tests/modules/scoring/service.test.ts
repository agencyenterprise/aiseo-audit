import { describe, expect, it } from "vitest";
import type {
  CategoryNameType,
  CategoryResultType,
} from "../../../src/modules/audits/schema.js";
import {
  computeGrade,
  computeScore,
  makeFactor,
  maxFactors,
  statusFromScore,
  sumFactors,
  thresholdScore,
} from "../../../src/modules/scoring/service.js";

describe("thresholdScore", () => {
  it("returns score for matching threshold", () => {
    const brackets: Array<[number, number]> = [
      [100, 10],
      [50, 5],
      [25, 2],
    ];

    expect(thresholdScore(100, brackets)).toBe(10);
    expect(thresholdScore(75, brackets)).toBe(5);
    expect(thresholdScore(50, brackets)).toBe(5);
    expect(thresholdScore(30, brackets)).toBe(2);
    expect(thresholdScore(25, brackets)).toBe(2);
    expect(thresholdScore(10, brackets)).toBe(0);
  });

  it("returns 0 when below all thresholds", () => {
    const brackets: Array<[number, number]> = [
      [50, 10],
      [25, 5],
    ];

    expect(thresholdScore(0, brackets)).toBe(0);
    expect(thresholdScore(24, brackets)).toBe(0);
  });

  it("defaults to higher type", () => {
    expect(
      thresholdScore(5, [
        [10, 10],
        [5, 5],
      ]),
    ).toBe(5);
    expect(
      thresholdScore(4, [
        [10, 10],
        [5, 5],
      ]),
    ).toBe(0);
  });

  it("scores by lower when type is lower", () => {
    const brackets: Array<[number, number]> = [
      [0.02, 15],
      [0.05, 12],
      [0.1, 8],
    ];

    expect(thresholdScore(0.01, brackets, "lower")).toBe(15);
    expect(thresholdScore(0.02, brackets, "lower")).toBe(15);
    expect(thresholdScore(0.03, brackets, "lower")).toBe(12);
    expect(thresholdScore(0.05, brackets, "lower")).toBe(12);
    expect(thresholdScore(0.07, brackets, "lower")).toBe(8);
    expect(thresholdScore(0.1, brackets, "lower")).toBe(8);
    expect(thresholdScore(0.2, brackets, "lower")).toBe(0);
  });

  it("scores by range when type is range", () => {
    const brackets: Array<[number, number, number]> = [
      [12, 22, 15],
      [8, 29, 10],
      [1, Infinity, 5],
    ];

    expect(thresholdScore(15, brackets, "range")).toBe(15);
    expect(thresholdScore(12, brackets, "range")).toBe(15);
    expect(thresholdScore(22, brackets, "range")).toBe(15);
    expect(thresholdScore(8, brackets, "range")).toBe(10);
    expect(thresholdScore(29, brackets, "range")).toBe(10);
    expect(thresholdScore(1, brackets, "range")).toBe(5);
    expect(thresholdScore(100, brackets, "range")).toBe(5);
    expect(thresholdScore(0, brackets, "range")).toBe(0);
  });

  it("returns 0 when no range matches", () => {
    const brackets: Array<[number, number, number]> = [
      [10, 20, 15],
      [30, 40, 10],
    ];

    expect(thresholdScore(25, brackets, "range")).toBe(0);
    expect(thresholdScore(0, brackets, "range")).toBe(0);
  });
});

describe("statusFromScore", () => {
  it('returns "good" for 70%+', () => {
    expect(statusFromScore(70, 100)).toBe("good");
    expect(statusFromScore(100, 100)).toBe("good");
    expect(statusFromScore(7, 10)).toBe("good");
  });

  it('returns "needs_improvement" for 30-69%', () => {
    expect(statusFromScore(50, 100)).toBe("needs_improvement");
    expect(statusFromScore(30, 100)).toBe("needs_improvement");
    expect(statusFromScore(69, 100)).toBe("needs_improvement");
  });

  it('returns "critical" for <30%', () => {
    expect(statusFromScore(0, 100)).toBe("critical");
    expect(statusFromScore(29, 100)).toBe("critical");
  });

  it("handles zero maxScore", () => {
    expect(statusFromScore(0, 0)).toBe("critical");
  });
});

describe("makeFactor", () => {
  it("creates a factor with computed status", () => {
    const factor = makeFactor("Test Factor", 80, 100, "test value");

    expect(factor.name).toBe("Test Factor");
    expect(factor.score).toBe(80);
    expect(factor.maxScore).toBe(100);
    expect(factor.value).toBe("test value");
    expect(factor.status).toBe("good");
  });

  it("caps score at maxScore", () => {
    const factor = makeFactor("Test Factor", 150, 100, "test");

    expect(factor.score).toBe(100);
  });

  it("allows status override", () => {
    const factor = makeFactor("Test Factor", 80, 100, "test", "neutral");

    expect(factor.status).toBe("neutral");
  });
});

describe("sumFactors", () => {
  it("sums factor scores", () => {
    const factors = [
      makeFactor("A", 10, 20, ""),
      makeFactor("B", 15, 20, ""),
      makeFactor("C", 5, 10, ""),
    ];

    expect(sumFactors(factors)).toBe(30);
  });

  it("returns 0 for empty array", () => {
    expect(sumFactors([])).toBe(0);
  });
});

describe("maxFactors", () => {
  it("sums max scores", () => {
    const factors = [
      makeFactor("A", 10, 20, ""),
      makeFactor("B", 15, 20, ""),
      makeFactor("C", 5, 10, ""),
    ];

    expect(maxFactors(factors)).toBe(50);
  });

  it("returns 0 for empty array", () => {
    expect(maxFactors([])).toBe(0);
  });
});

function makeCategory(
  name: string,
  key: CategoryNameType,
  score: number,
  maxScore: number,
): CategoryResultType {
  return { name, key, score, maxScore, factors: [] };
}

describe("computeScore", () => {
  it("computes weighted average correctly with equal weights", () => {
    const categories: Record<string, CategoryResultType> = {
      contentExtractability: makeCategory(
        "Content Extractability",
        "contentExtractability",
        80,
        100,
      ),
      contentStructure: makeCategory(
        "Content Structure",
        "contentStructure",
        60,
        100,
      ),
      answerability: makeCategory("Answerability", "answerability", 40, 100),
      entityClarity: makeCategory("Entity Clarity", "entityClarity", 100, 100),
      groundingSignals: makeCategory(
        "Grounding Signals",
        "groundingSignals",
        50,
        100,
      ),
      authorityContext: makeCategory(
        "Authority Context",
        "authorityContext",
        70,
        100,
      ),
      readabilityForCompression: makeCategory(
        "Readability",
        "readabilityForCompression",
        90,
        100,
      ),
    };

    const weights = {
      contentExtractability: 1,
      contentStructure: 1,
      answerability: 1,
      entityClarity: 1,
      groundingSignals: 1,
      authorityContext: 1,
      readabilityForCompression: 1,
    };

    const result = computeScore(categories, weights);

    expect(result.overallScore).toBe(70);
    expect(result.totalPoints).toBe(490);
    expect(result.maxPoints).toBe(700);
  });

  it("applies custom weights correctly", () => {
    const categories: Record<string, CategoryResultType> = {
      contentExtractability: makeCategory(
        "Content Extractability",
        "contentExtractability",
        100,
        100,
      ),
      contentStructure: makeCategory(
        "Content Structure",
        "contentStructure",
        0,
        100,
      ),
      answerability: makeCategory("Answerability", "answerability", 0, 100),
      entityClarity: makeCategory("Entity Clarity", "entityClarity", 0, 100),
      groundingSignals: makeCategory(
        "Grounding Signals",
        "groundingSignals",
        0,
        100,
      ),
      authorityContext: makeCategory(
        "Authority Context",
        "authorityContext",
        0,
        100,
      ),
      readabilityForCompression: makeCategory(
        "Readability",
        "readabilityForCompression",
        0,
        100,
      ),
    };

    const weights = {
      contentExtractability: 6,
      contentStructure: 1,
      answerability: 1,
      entityClarity: 1,
      groundingSignals: 1,
      authorityContext: 1,
      readabilityForCompression: 1,
    };

    const result = computeScore(categories, weights);

    expect(result.overallScore).toBe(50);
  });

  it("excludes categories with zero weight", () => {
    const categories: Record<string, CategoryResultType> = {
      contentExtractability: makeCategory(
        "Content Extractability",
        "contentExtractability",
        100,
        100,
      ),
      contentStructure: makeCategory(
        "Content Structure",
        "contentStructure",
        0,
        100,
      ),
      answerability: makeCategory("Answerability", "answerability", 100, 100),
      entityClarity: makeCategory("Entity Clarity", "entityClarity", 100, 100),
      groundingSignals: makeCategory(
        "Grounding Signals",
        "groundingSignals",
        100,
        100,
      ),
      authorityContext: makeCategory(
        "Authority Context",
        "authorityContext",
        100,
        100,
      ),
      readabilityForCompression: makeCategory(
        "Readability",
        "readabilityForCompression",
        100,
        100,
      ),
    };

    const weights = {
      contentExtractability: 1,
      contentStructure: 0,
      answerability: 1,
      entityClarity: 1,
      groundingSignals: 1,
      authorityContext: 1,
      readabilityForCompression: 1,
    };

    const result = computeScore(categories, weights);

    expect(result.overallScore).toBe(100);
  });

  it("assigns correct grades", () => {
    const makeResult = (pct: number) => {
      const categories: Record<string, CategoryResultType> = {
        contentExtractability: makeCategory(
          "Content Extractability",
          "contentExtractability",
          pct,
          100,
        ),
      };
      const weights = {
        contentExtractability: 1,
        contentStructure: 0,
        answerability: 0,
        entityClarity: 0,
        groundingSignals: 0,
        authorityContext: 0,
        readabilityForCompression: 0,
      };
      return computeScore(categories, weights);
    };

    expect(makeResult(95).grade).toBe("A");
    expect(makeResult(93).grade).toBe("A");
    expect(makeResult(90).grade).toBe("A-");
    expect(makeResult(87).grade).toBe("B+");
    expect(makeResult(83).grade).toBe("B");
    expect(makeResult(80).grade).toBe("B-");
    expect(makeResult(77).grade).toBe("C+");
    expect(makeResult(73).grade).toBe("C");
    expect(makeResult(70).grade).toBe("C-");
    expect(makeResult(67).grade).toBe("D+");
    expect(makeResult(63).grade).toBe("D");
    expect(makeResult(60).grade).toBe("D-");
    expect(makeResult(30).grade).toBe("F");
  });

  it("handles empty categories", () => {
    const categories: Record<string, CategoryResultType> = {};
    const weights = {
      contentExtractability: 1,
      contentStructure: 1,
      answerability: 1,
      entityClarity: 1,
      groundingSignals: 1,
      authorityContext: 1,
      readabilityForCompression: 1,
    };

    const result = computeScore(categories, weights);

    expect(result.overallScore).toBe(0);
    expect(result.totalPoints).toBe(0);
    expect(result.maxPoints).toBe(0);
    expect(result.grade).toBe("F");
  });

  it("falls back to 1/7 normalized weight when all weights are zero", () => {
    const categories: Record<string, CategoryResultType> = {
      contentExtractability: makeCategory(
        "Content Extractability",
        "contentExtractability",
        100,
        100,
      ),
    };
    const weights = {
      contentExtractability: 0,
      contentStructure: 0,
      answerability: 0,
      entityClarity: 0,
      groundingSignals: 0,
      authorityContext: 0,
      readabilityForCompression: 0,
    };
    const result = computeScore(categories, weights);
    expect(result.overallScore).toBeGreaterThan(0);
  });

  it("scores 0 for a category with maxScore of zero", () => {
    const categories: Record<string, CategoryResultType> = {
      contentExtractability: makeCategory(
        "Content Extractability",
        "contentExtractability",
        0,
        0,
      ),
    };
    const weights = {
      contentExtractability: 1,
      contentStructure: 0,
      answerability: 0,
      entityClarity: 0,
      groundingSignals: 0,
      authorityContext: 0,
      readabilityForCompression: 0,
    };
    const result = computeScore(categories, weights);
    expect(result.overallScore).toBe(0);
  });
});

describe("computeGrade", () => {
  it("returns F for a score below all thresholds (e.g. negative)", () => {
    expect(computeGrade(-1)).toBe("F");
  });
});

describe("computeScore weight fallback branch", () => {
  it("uses weight 1 for unknown category key not in weightMap", () => {
    const categories: Record<string, CategoryResultType> = {
      customUnknownKey: makeCategory(
        "Custom Category",
        "contentExtractability",
        50,
        100,
      ),
    };
    const weights = {
      contentExtractability: 1,
      contentStructure: 1,
      answerability: 1,
      entityClarity: 1,
      groundingSignals: 1,
      authorityContext: 1,
      readabilityForCompression: 1,
    };
    const result = computeScore(categories, weights);
    expect(result.overallScore).toBeGreaterThan(0);
  });
});
