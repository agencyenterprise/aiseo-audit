import { computeScore } from './service.js';
import { normalizeError } from '../errors/service.js';
import type { CategoryResult } from '../audits/schema.js';
import type { CategoryWeight } from '../config/schema.js';
import type { ScoreSummary } from './schema.js';
import type { NormalizedError } from '../errors/schema.js';

export function computeScoreSafe(
  categories: Record<string, CategoryResult>,
  weights: CategoryWeight
): { data: ScoreSummary } | { error: NormalizedError } {
  try {
    const data = computeScore(categories, weights);
    return { data };
  } catch (err) {
    return { error: normalizeError(err) };
  }
}
