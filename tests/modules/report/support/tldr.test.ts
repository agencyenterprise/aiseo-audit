import { describe, expect, it } from "vitest";
import type { AnalyzerResultType } from "../../../../src/modules/analyzer/schema.js";
import { buildTldr } from "../../../../src/modules/report/support/tldr.js";

function makeResult(
  overrides?: Partial<AnalyzerResultType>,
): AnalyzerResultType {
  return {
    url: "https://example.com",
    signalsBase: "https://example.com",
    analyzedAt: "2026-04-17T00:00:00.000Z",
    overallScore: 59,
    grade: "F",
    totalPoints: 276,
    maxPoints: 462,
    categories: {
      answerability: {
        name: "Answerability",
        key: "answerability",
        score: 18,
        maxScore: 64,
        factors: [
          {
            name: "Answer Capsules",
            score: 0,
            maxScore: 13,
            value: "",
            status: "critical",
          },
        ],
      },
      authorityContext: {
        name: "Authority Context",
        key: "authorityContext",
        score: 57,
        maxScore: 82,
        factors: [
          {
            name: "Author Attribution",
            score: 0,
            maxScore: 10,
            value: "",
            status: "critical",
          },
        ],
      },
      contentExtractability: {
        name: "Content Extractability",
        key: "contentExtractability",
        score: 61,
        maxScore: 72,
        factors: [
          {
            name: "Image Alt Text",
            score: 1,
            maxScore: 8,
            value: "",
            status: "critical",
          },
        ],
      },
    },
    recommendations: [
      {
        category: "Answerability",
        factor: "Answer Capsules",
        currentValue: "0",
        priority: "high",
        recommendation: "Add answer capsules",
        expectedGain: 13,
      },
      {
        category: "Authority Context",
        factor: "Author Attribution",
        currentValue: "Not found",
        priority: "high",
        recommendation: "Add author",
        expectedGain: 10,
      },
      {
        category: "Content Extractability",
        factor: "Image Alt Text",
        currentValue: "1/8",
        priority: "high",
        recommendation: "Add alt text",
        expectedGain: 7,
      },
      {
        category: "Answerability",
        factor: "Summary",
        currentValue: "0",
        priority: "low",
        recommendation: "Add summary",
        expectedGain: 2,
      },
    ],
    rawData: { title: "Test", metaDescription: "", wordCount: 100 },
    meta: { version: "1.5.0", analysisDurationMs: 120 },
    ...overrides,
  };
}

describe("buildTldr", () => {
  it("returns the current score and grade", () => {
    const tldr = buildTldr(makeResult());
    expect(tldr.score).toBe(59);
    expect(tldr.grade).toBe("F");
  });

  it("picks the top 3 wins sorted by expectedGain descending", () => {
    const tldr = buildTldr(makeResult());
    expect(tldr.quickestWins).toHaveLength(3);
    expect(tldr.quickestWins[0].factor).toBe("Answer Capsules");
    expect(tldr.quickestWins[0].expectedGain).toBe(13);
    expect(tldr.quickestWins[1].factor).toBe("Author Attribution");
    expect(tldr.quickestWins[2].factor).toBe("Image Alt Text");
  });

  it("excludes recommendations with zero expected gain", () => {
    const result = makeResult();
    result.recommendations[0].expectedGain = 0;
    const tldr = buildTldr(result);
    expect(tldr.quickestWins.every((w) => w.expectedGain > 0)).toBe(true);
  });

  it("projects a score higher than the baseline when wins are applied", () => {
    const baseline = buildTldr(
      makeResult({ recommendations: [] }),
    ).projectedScore;
    const withWins = buildTldr(makeResult()).projectedScore;
    expect(withWins).toBeGreaterThan(baseline);
  });

  it("projects the same score as current when there are no wins", () => {
    const tldr = buildTldr(makeResult({ recommendations: [] }));
    expect(tldr.quickestWins).toHaveLength(0);
    expect(tldr.projectedScore).toBe(tldr.score);
  });

  it("honors a smaller maxWins cap", () => {
    const tldr = buildTldr(makeResult(), undefined, 1);
    expect(tldr.quickestWins).toHaveLength(1);
    expect(tldr.quickestWins[0].factor).toBe("Answer Capsules");
  });

  it("includes a projected grade derived from the projected score", () => {
    const tldr = buildTldr(makeResult());
    expect(tldr.projectedGrade).toMatch(/^[A-F][+-]?$/);
  });

  it("projects the exact expected score for a hand-computed fixture", () => {
    // Single category, single factor, single win. Uniform weights means each
    // category contributes 1/7 to the weighted score.
    //   Baseline:  Word Count 5/10 = 50% * 1/7 ≈ 7  (rounded)
    //   With win:  Word Count 10/10 = 100% * 1/7 ≈ 14 (rounded)
    //   Delta = 14 - 7 = 7
    //   projectedScore = clamp(overallScore + delta) = 50 + 7 = 57
    const result: AnalyzerResultType = {
      url: "https://example.com",
      signalsBase: "https://example.com",
      analyzedAt: "2026-04-17T00:00:00.000Z",
      overallScore: 50,
      grade: "D",
      totalPoints: 5,
      maxPoints: 10,
      categories: {
        contentExtractability: {
          name: "Content Extractability",
          key: "contentExtractability",
          score: 5,
          maxScore: 10,
          factors: [
            {
              name: "Word Count",
              score: 5,
              maxScore: 10,
              value: "5/10",
              status: "needs_improvement",
            },
          ],
        },
      },
      recommendations: [
        {
          category: "Content Extractability",
          factor: "Word Count",
          currentValue: "5/10",
          priority: "medium",
          recommendation: "Add more content",
          expectedGain: 5,
        },
      ],
      rawData: { title: "Test", metaDescription: "", wordCount: 5 },
      meta: { version: "1.5.0", analysisDurationMs: 1 },
    };

    const tldr = buildTldr(result);

    expect(tldr.score).toBe(50);
    expect(tldr.projectedScore).toBe(57);
    expect(tldr.projectedGrade).toBe("F");
  });
});
