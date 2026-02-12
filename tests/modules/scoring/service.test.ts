import { describe, expect, it } from "vitest";
import type {
  CategoryNameType,
  CategoryResultType,
} from "../../../src/modules/audits/schema.js";
import { computeScore } from "../../../src/modules/scoring/service.js";

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

    expect(makeResult(95).grade).toBe("A+");
    expect(makeResult(90).grade).toBe("A");
    expect(makeResult(85).grade).toBe("A-");
    expect(makeResult(80).grade).toBe("B+");
    expect(makeResult(75).grade).toBe("B");
    expect(makeResult(70).grade).toBe("B-");
    expect(makeResult(65).grade).toBe("C+");
    expect(makeResult(60).grade).toBe("C");
    expect(makeResult(55).grade).toBe("C-");
    expect(makeResult(45).grade).toBe("D");
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
});
