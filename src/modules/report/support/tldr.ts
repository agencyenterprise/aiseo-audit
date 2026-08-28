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

const DEFAULT_MAX_WINS = 3;

export function buildTldr(
  result: AnalyzerResultType,
  maxWins: number = DEFAULT_MAX_WINS,
): TldrType {
  const weights = weightsTheResultWasScoredWith(result);
  const quickestWins = selectQuickestWins(result, weights, maxWins);
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

function weightsTheResultWasScoredWith(
  result: AnalyzerResultType,
): CategoryWeightType {
  return result.meta.weights ?? uniformWeights(result);
}

function uniformWeights(result: AnalyzerResultType): CategoryWeightType {
  return Object.fromEntries(
    Object.keys(result.categories).map((key) => [key, 1]),
  ) as CategoryWeightType;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function selectQuickestWins(
  result: AnalyzerResultType,
  weights: CategoryWeightType,
  maxWins: number,
): QuickWinType[] {
  const entries = Object.entries(result.categories);
  const weightOf = (key: string) =>
    weights[key as keyof CategoryWeightType] ?? 1;
  const totalWeight = entries.reduce((sum, [key]) => sum + weightOf(key), 0);
  const categoryByName = new Map(
    entries.map(([key, cat]) => [cat.name, { key, cat }]),
  );

  return result.recommendations
    .flatMap((r) => {
      const found = categoryByName.get(r.category);
      const gain = r.expectedGain ?? 0;
      if (!found || gain <= 0 || found.cat.maxScore <= 0 || totalWeight <= 0) {
        return [];
      }
      const overallImpact =
        (gain / found.cat.maxScore) * (weightOf(found.key) / totalWeight) * 100;
      return [
        {
          factor: r.factor,
          category: r.category,
          expectedGain: gain,
          overallImpact,
        },
      ];
    })
    .sort((a, b) => b.overallImpact - a.overallImpact)
    .slice(0, maxWins)
    .map(({ factor, category, expectedGain }) => ({
      factor,
      category,
      expectedGain,
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
