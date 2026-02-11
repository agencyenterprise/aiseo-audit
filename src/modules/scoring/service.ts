import type { CategoryResult } from '../audits/schema.js';
import type { CategoryWeight } from '../config/schema.js';
import type { Grade, ScoreSummary } from './schema.js';
import { GRADE_THRESHOLDS } from './constants.js';

export function computeScore(
  categories: Record<string, CategoryResult>,
  weights: CategoryWeight
): ScoreSummary {
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
    const categoryPct = category.maxScore > 0
      ? (category.score / category.maxScore) * 100
      : 0;
    weightedScore += categoryPct * normalizedWeight;
  }

  const overallScore = Math.round(weightedScore);
  const grade = computeGrade(overallScore);

  return { overallScore, grade, totalPoints, maxPoints };
}

function computeGrade(score: number): Grade {
  for (const [threshold, grade] of GRADE_THRESHOLDS) {
    if (score >= threshold) return grade;
  }
  return 'F';
}
