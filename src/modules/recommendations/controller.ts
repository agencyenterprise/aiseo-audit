import { generateRecommendations } from './service.js';
import { normalizeError } from '../errors/service.js';
import type { AuditResult } from '../audits/schema.js';
import type { Recommendation } from './schema.js';
import type { NormalizedError } from '../errors/schema.js';

export function generateRecommendationsSafe(
  auditResult: AuditResult
): { data: Recommendation[] } | { error: NormalizedError } {
  try {
    const data = generateRecommendations(auditResult);
    return { data };
  } catch (err) {
    return { error: normalizeError(err) };
  }
}
