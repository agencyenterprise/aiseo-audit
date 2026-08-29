import type { AnalyzerResultType } from "../../src/modules/analyzer/schema.js";
import type {
  CategoryResultType,
  FactorResultType,
} from "../../src/modules/audits/schema.js";
import type { RecommendationType } from "../../src/modules/recommendations/schema.js";
import type {
  GateResultType,
  StageScoresType,
} from "../../src/modules/scoring/schema.js";

export function makeFactor(
  overrides: Partial<FactorResultType> = {},
): FactorResultType {
  return {
    name: "Fetch Success",
    score: 15,
    maxScore: 15,
    value: "HTTP 200 in 100ms",
    status: "good",
    ...overrides,
  };
}

export function makeCategory(
  overrides: Partial<CategoryResultType> = {},
): CategoryResultType {
  return {
    name: "Content Extractability",
    key: "contentExtractability",
    score: 50,
    maxScore: 60,
    factors: [
      makeFactor(),
      makeFactor({
        name: "Word Count",
        score: 35,
        maxScore: 45,
        value: "500 words",
        status: "needs_improvement",
      }),
    ],
    ...overrides,
  };
}

export function makeRecommendation(
  overrides: Partial<RecommendationType> = {},
): RecommendationType {
  return {
    category: "Authority Context",
    factor: "Author Attribution",
    currentValue: "Not found",
    priority: "high",
    recommendation: "Add visible author information.",
    ...overrides,
  };
}

export function makeGate(
  overrides: Partial<GateResultType> = {},
): GateResultType {
  return {
    id: "staleVisibleDate",
    label: "Visible date is stale",
    status: "pass",
    capPct: 50,
    citations: ["what-gets-cited-sigir-2026"],
    ...overrides,
  };
}

export function makeStages(
  overrides: Partial<StageScoresType> = {},
): StageScoresType {
  return {
    technicalEligibility: {
      score: 40,
      maxScore: 46,
      pct: 87,
      suppressed: false,
      status: "pass",
      blockers: [],
    },
    retrievalAlignment: { score: 60, maxScore: 80, pct: 75, suppressed: false },
    citationFitness: {
      score: 90,
      maxScore: 140,
      pct: 64,
      suppressed: false,
      uncappedPct: 64,
      gates: [makeGate()],
    },
    provenance: { score: 22, maxScore: 30, pct: 73, suppressed: false },
    ...overrides,
  };
}

export function makeResult(
  overrides: Partial<AnalyzerResultType> = {},
): AnalyzerResultType {
  return {
    url: "https://example.com",
    signalsBase: "https://example.com",
    analyzedAt: "2026-02-11T12:00:00.000Z",
    overallScore: 72,
    grade: "B-",
    totalPoints: 302,
    maxPoints: 420,
    categories: {
      contentExtractability: makeCategory(),
      authorityContext: makeCategory({
        name: "Authority Context",
        key: "authorityContext",
        score: 20,
        maxScore: 40,
        factors: [
          makeFactor({
            name: "Author Attribution",
            score: 0,
            maxScore: 10,
            value: "Not found",
            status: "critical",
          }),
          makeFactor({
            name: "Publication Date",
            score: 10,
            maxScore: 10,
            value: "Found",
            status: "good",
          }),
        ],
      }),
    },
    recommendations: [
      makeRecommendation(),
      makeRecommendation({
        category: "Content Extractability",
        factor: "Word Count",
        currentValue: "500 words",
        priority: "low",
        recommendation: "Add more content.",
      }),
    ],
    rawData: { title: "Test Page", metaDescription: "", wordCount: 500 },
    meta: { version: "0.1.0", analysisDurationMs: 150 },
    ...overrides,
  };
}
