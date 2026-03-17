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
    return scoreByRange(value, brackets as RangeBracketType[]);
  }

  if (type === "lower") {
    return scoreByLower(value, brackets as BracketType[]);
  }

  return scoreByHigher(value, brackets as BracketType[]);
}

function scoreByHigher(value: number, brackets: BracketType[]): number {
  for (const [threshold, score] of brackets) {
    if (value >= threshold) return score;
  }
  return 0;
}

function scoreByLower(value: number, brackets: BracketType[]): number {
  for (const [threshold, score] of brackets) {
    if (value <= threshold) return score;
  }
  return 0;
}

function scoreByRange(value: number, brackets: RangeBracketType[]): number {
  for (const [min, max, score] of brackets) {
    if (value >= min && value <= max) return score;
  }
  return 0;
}

export function statusFromScore(
  score: number,
  maxScore: number,
): FactorStatusType {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct >= 0.7) return "good";
  if (pct >= 0.3) return "needs_improvement";
  return "critical";
}

export function makeFactor(
  name: string,
  score: number,
  maxScore: number,
  value: string,
  statusOverride?: FactorStatusType,
): FactorResultType {
  return {
    name,
    score: Math.round(Math.min(score, maxScore)),
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
  const weightMap: Record<string, number> = {
    contentExtractability: weights.contentExtractability,
    contentStructure: weights.contentStructure,
    answerability: weights.answerability,
    entityClarity: weights.entityClarity,
    groundingSignals: weights.groundingSignals,
    authorityContext: weights.authorityContext,
    readabilityForCompression: weights.readabilityForCompression,
  };

  const totalWeight = Object.values(weightMap).reduce((sum, w) => sum + w, 0);
  let totalPoints = 0;
  let maxPoints = 0;
  let weightedScore = 0;

  for (const [key, category] of Object.entries(categories)) {
    totalPoints += category.score;
    maxPoints += category.maxScore;

    const w = weightMap[key] ?? 1;
    const normalizedWeight = totalWeight > 0 ? w / totalWeight : 1 / 7;
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
