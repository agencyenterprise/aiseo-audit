import type { AnalyzerResultType } from "../../analyzer/schema.js";
import type { CategoryResultType } from "../../audits/schema.js";
import type { CategoryWeightType } from "../../config/schema.js";
import { computeGrade, computeScore } from "../../scoring/service.js";

export type QuickWinType = {
  factor: string;
  category: string;
  expectedGain: number;
};

export type TldrType = {
  score: number;
  grade: string;
  projectedScore: number;
  projectedGrade: string;
  quickestWins: QuickWinType[];
};

const UNIFORM_WEIGHTS: CategoryWeightType = {
  contentExtractability: 1,
  contentStructure: 1,
  answerability: 1,
  entityClarity: 1,
  groundingSignals: 1,
  authorityContext: 1,
  readabilityForCompression: 1,
};

const DEFAULT_MAX_WINS = 3;

export function buildTldr(
  result: AnalyzerResultType,
  weights: CategoryWeightType = UNIFORM_WEIGHTS,
  maxWins: number = DEFAULT_MAX_WINS,
): TldrType {
  const quickestWins = selectQuickestWins(result, maxWins);
  const baseline = computeScore(result.categories, weights);
  const projectedCategories = applyWinsToCategories(
    result.categories,
    quickestWins,
  );
  const projected = computeScore(projectedCategories, weights);

  const delta = projected.overallScore - baseline.overallScore;
  const projectedScore = clampScore(result.overallScore + delta);

  return {
    score: result.overallScore,
    grade: result.grade,
    projectedScore,
    projectedGrade: computeGrade(projectedScore),
    quickestWins,
  };
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function selectQuickestWins(
  result: AnalyzerResultType,
  maxWins: number,
): QuickWinType[] {
  return result.recommendations
    .filter((r) => (r.expectedGain ?? 0) > 0)
    .sort((a, b) => (b.expectedGain ?? 0) - (a.expectedGain ?? 0))
    .slice(0, maxWins)
    .map((r) => ({
      factor: r.factor,
      category: r.category,
      expectedGain: r.expectedGain ?? 0,
    }));
}

function applyWinsToCategories(
  categories: Record<string, CategoryResultType>,
  wins: QuickWinType[],
): Record<string, CategoryResultType> {
  const cloned: Record<string, CategoryResultType> = {};
  for (const [key, cat] of Object.entries(categories)) {
    cloned[key] = {
      ...cat,
      factors: cat.factors.map((f) => ({ ...f })),
    };
  }

  for (const win of wins) {
    for (const cat of Object.values(cloned)) {
      if (cat.name !== win.category) continue;
      for (const factor of cat.factors) {
        if (factor.name !== win.factor) continue;
        const gain = Math.max(0, factor.maxScore - factor.score);
        factor.score += gain;
        cat.score = Math.min(cat.maxScore, cat.score + gain);
      }
    }
  }

  return cloned;
}
