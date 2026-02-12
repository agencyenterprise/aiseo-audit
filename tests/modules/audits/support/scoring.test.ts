import { describe, expect, it } from "vitest";
import {
  booleanScore,
  makeFactor,
  maxFactors,
  rangeScore,
  statusFromScore,
  sumFactors,
  thresholdScore,
} from "../../../../src/modules/audits/support/scoring.js";

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
});

describe("rangeScore", () => {
  it("returns maxScore when value is within ideal range", () => {
    expect(rangeScore(50, 30, 70, 100)).toBe(100);
    expect(rangeScore(30, 30, 70, 100)).toBe(100);
    expect(rangeScore(70, 30, 70, 100)).toBe(100);
  });

  it("scales down when below ideal minimum", () => {
    expect(rangeScore(15, 30, 70, 100)).toBe(50);
    expect(rangeScore(0, 30, 70, 100)).toBe(10);
  });

  it("penalizes excess above ideal maximum", () => {
    const score = rangeScore(140, 30, 70, 100);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(0);
  });
});

describe("booleanScore", () => {
  it("returns maxScore for true", () => {
    expect(booleanScore(true, 10)).toBe(10);
    expect(booleanScore(true, 100)).toBe(100);
  });

  it("returns 0 for false", () => {
    expect(booleanScore(false, 10)).toBe(0);
    expect(booleanScore(false, 100)).toBe(0);
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
