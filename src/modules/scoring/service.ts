import type { FactorNameType } from "../audits/factor-names.js";
import type {
  CategoryResultType,
  FactorResultType,
  FactorStatusType,
} from "../audits/schema.js";
import type { CategoryWeightType } from "../config/schema.js";
import { GRADE_THRESHOLDS } from "./constants.js";
import type {
  BracketType,
  GradeType,
  RangeBracketType,
  ScoreSummaryType,
  ThresholdType,
} from "./schema.js";

export function thresholdScore(
  value: number,
  brackets: BracketType[] | RangeBracketType[],
  type: ThresholdType = "higher",
): number {
  if (type === "range") {
    return scoreByFirstMatchingHalfOpenRange(
      value,
      brackets as RangeBracketType[],
    );
  }

  if (type === "lower") {
    return scoreByLower(value, brackets as BracketType[]);
  }

  return scoreByHigher(value, brackets as BracketType[]);
}

function scoreByHigher(value: number, brackets: BracketType[]): number {
  let best: BracketType | null = null;
  for (const bracket of brackets) {
    if (value >= bracket[0] && (best === null || bracket[0] > best[0])) {
      best = bracket;
    }
  }
  return best?.[1] ?? 0;
}

function scoreByLower(value: number, brackets: BracketType[]): number {
  let best: BracketType | null = null;
  for (const bracket of brackets) {
    if (value <= bracket[0] && (best === null || bracket[0] < best[0])) {
      best = bracket;
    }
  }
  return best?.[1] ?? 0;
}

function scoreByFirstMatchingHalfOpenRange(
  value: number,
  brackets: RangeBracketType[],
): number {
  for (const [minInclusive, maxExclusive, score] of brackets) {
    if (value >= minInclusive && value < maxExclusive) return score;
  }
  return 0;
}

export const GOOD_FACTOR_PCT = 0.7;
export const CRITICAL_FACTOR_PCT = 0.3;

export function statusFromScore(
  score: number,
  maxScore: number,
): FactorStatusType {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct >= GOOD_FACTOR_PCT) return "good";
  if (pct >= CRITICAL_FACTOR_PCT) return "needs_improvement";
  return "critical";
}

export function makeFactor(
  name: FactorNameType,
  score: number,
  maxScore: number,
  value: string,
  statusOverride?: FactorStatusType,
): FactorResultType {
  return {
    name,
    score: Math.max(0, Math.round(Math.min(score, maxScore))),
    maxScore,
    value,
    status: statusOverride ?? statusFromScore(score, maxScore),
  };
}

export function sumFactors(factors: FactorResultType[]): number {
  return factors.reduce((sum, f) => sum + f.score, 0);
}

export function maxFactors(factors: FactorResultType[]): number {
  return factors.reduce((sum, f) => sum + f.maxScore, 0);
}

export function computeScore(
  categories: Record<string, CategoryResultType>,
  weights: CategoryWeightType,
): ScoreSummaryType {
  const entries = Object.entries(categories);
  const weightOf = (key: string) =>
    weights[key as keyof CategoryWeightType] ?? 1;
  const totalWeightOfPresentCategories = entries.reduce(
    (sum, [key]) => sum + weightOf(key),
    0,
  );

  let totalPoints = 0;
  let maxPoints = 0;
  let weightedScore = 0;

  for (const [key, category] of entries) {
    totalPoints += category.score;
    maxPoints += category.maxScore;

    const normalizedWeight =
      totalWeightOfPresentCategories > 0
        ? weightOf(key) / totalWeightOfPresentCategories
        : 1 / entries.length;
    const categoryPct =
      category.maxScore > 0 ? (category.score / category.maxScore) * 100 : 0;
    weightedScore += categoryPct * normalizedWeight;
  }

  const overallScore = Math.round(weightedScore);
  const grade = computeGrade(overallScore);

  return { overallScore, grade, totalPoints, maxPoints };
}

export function computeGrade(score: number): GradeType {
  for (const [threshold, grade] of GRADE_THRESHOLDS) {
    if (score >= threshold) return grade;
  }
  return "F";
}
