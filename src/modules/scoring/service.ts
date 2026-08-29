import type { FactorNameType } from "../audits/factor-names.js";
import type {
  CategoryResultType,
  EvidenceTierType,
  FactorResultType,
  FactorStatusType,
} from "../audits/schema.js";
import { DEFAULT_EVIDENCE_TIER, FACTOR_REGISTRY } from "../audits/stage.js";
import type { CategoryWeightType, StageWeightType } from "../config/schema.js";
import { ELIGIBILITY_FAIL_CAP, GRADE_THRESHOLDS } from "./constants.js";
import type {
  BracketType,
  GradeType,
  RangeBracketType,
  ScoreSummaryType,
  StageScoresType,
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
  const meta = FACTOR_REGISTRY[name];
  return {
    name,
    score: Math.max(0, Math.round(Math.min(score, maxScore))),
    maxScore,
    value,
    status: statusOverride ?? statusFromScore(score, maxScore),
    evidence: meta?.evidence ?? DEFAULT_EVIDENCE_TIER,
    citations: meta?.citations ?? [],
  };
}

export function makeDiagnostic(
  name: FactorNameType,
  value: string,
): FactorResultType {
  const meta = FACTOR_REGISTRY[name];
  return {
    name,
    score: 0,
    maxScore: 0,
    value,
    status: "info",
    evidence: meta?.evidence ?? "diagnostic",
    citations: meta?.citations ?? [],
  };
}

export function evidenceTierOf(factor: FactorResultType): EvidenceTierType {
  return (
    factor.evidence ??
    FACTOR_REGISTRY[factor.name as FactorNameType]?.evidence ??
    DEFAULT_EVIDENCE_TIER
  );
}

export function isScorable(factor: FactorResultType): boolean {
  if (factor.status === "neutral" || factor.status === "info") return false;
  return evidenceTierOf(factor) !== "diagnostic";
}

export function sumFactors(factors: FactorResultType[]): number {
  return factors.filter(isScorable).reduce((sum, f) => sum + f.score, 0);
}

export function maxFactors(factors: FactorResultType[]): number {
  return factors.filter(isScorable).reduce((sum, f) => sum + f.maxScore, 0);
}

export type ComputeScoreOptionsType = {
  stages?: StageScoresType;
  stageWeights?: StageWeightType;
};

export function computeScore(
  categories: Record<string, CategoryResultType>,
  weights: CategoryWeightType,
  options: ComputeScoreOptionsType = {},
): ScoreSummaryType {
  const entries = Object.entries(categories);
  const scorableEntries = entries.filter(
    ([, category]) => category.maxScore > 0,
  );
  const weightOf = (key: string) =>
    weights[key as keyof CategoryWeightType] ?? 1;
  const totalWeightOfScorableCategories = scorableEntries.reduce(
    (sum, [key]) => sum + weightOf(key),
    0,
  );

  const totalPoints = entries.reduce(
    (sum, [, category]) => sum + category.score,
    0,
  );
  const maxPoints = entries.reduce(
    (sum, [, category]) => sum + category.maxScore,
    0,
  );

  let weightedScore = 0;
  for (const [key, category] of scorableEntries) {
    const normalizedWeight =
      totalWeightOfScorableCategories > 0
        ? weightOf(key) / totalWeightOfScorableCategories
        : 1 / scorableEntries.length;
    const categoryPct = (category.score / category.maxScore) * 100;
    weightedScore += categoryPct * normalizedWeight;
  }

  const { stages, stageWeights } = options;
  if (stages && stageWeights) {
    weightedScore = stageWeightedScore(stages, stageWeights) ?? weightedScore;
  }

  const eligibilityFailed = stages?.technicalEligibility.status === "fail";
  const overallScore = eligibilityFailed
    ? Math.min(Math.round(weightedScore), ELIGIBILITY_FAIL_CAP)
    : Math.round(weightedScore);
  const grade = computeGrade(overallScore);

  return { overallScore, grade, totalPoints, maxPoints };
}

function stageWeightedScore(
  stages: StageScoresType,
  stageWeights: StageWeightType,
): number | null {
  const scoredStages = Object.entries(stages).filter(
    ([, stage]) => stage.pct !== null,
  );
  const totalWeight = scoredStages.reduce(
    (sum, [name]) => sum + (stageWeights[name as keyof StageWeightType] ?? 1),
    0,
  );
  if (totalWeight === 0 || scoredStages.length === 0) return null;

  return scoredStages.reduce(
    (sum, [name, stage]) =>
      sum +
      (stage.pct as number) *
        ((stageWeights[name as keyof StageWeightType] ?? 1) / totalWeight),
    0,
  );
}

export function computeGrade(score: number): GradeType {
  for (const [threshold, grade] of GRADE_THRESHOLDS) {
    if (score >= threshold) return grade;
  }
  return "F";
}
