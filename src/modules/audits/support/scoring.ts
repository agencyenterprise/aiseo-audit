import type { FactorResult, FactorStatus } from '../schema.js';

export function thresholdScore(
  value: number,
  brackets: Array<[number, number]>
): number {
  for (const [threshold, score] of brackets) {
    if (value >= threshold) return score;
  }
  return 0;
}

export function rangeScore(
  value: number,
  idealMin: number,
  idealMax: number,
  maxScore: number = 100
): number {
  if (value >= idealMin && value <= idealMax) return maxScore;
  if (value < idealMin) {
    const ratio = idealMin > 0 ? value / idealMin : 0;
    return Math.round(maxScore * Math.max(0.1, ratio));
  }
  const excess = value - idealMax;
  const penalty = Math.min(excess / idealMax, 0.6);
  return Math.round(maxScore * (1 - penalty));
}

export function booleanScore(value: boolean, maxScore: number = 100): number {
  return value ? maxScore : 0;
}

export function statusFromScore(score: number, maxScore: number): FactorStatus {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct >= 0.7) return 'good';
  if (pct >= 0.3) return 'needs_improvement';
  return 'critical';
}

export function makeFactor(
  name: string,
  score: number,
  maxScore: number,
  value: string,
  statusOverride?: FactorStatus
): FactorResult {
  return {
    name,
    score: Math.round(Math.min(score, maxScore)),
    maxScore,
    value,
    status: statusOverride ?? statusFromScore(score, maxScore),
  };
}

export function sumFactors(factors: FactorResult[]): number {
  return factors.reduce((sum, f) => sum + f.score, 0);
}

export function maxFactors(factors: FactorResult[]): number {
  return factors.reduce((sum, f) => sum + f.maxScore, 0);
}
