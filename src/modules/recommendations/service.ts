import type { AuditResult } from '../audits/schema.js';
import type { Recommendation } from './schema.js';
import { RECOMMENDATION_MAP } from './constants.js';

export function generateRecommendations(auditResult: AuditResult): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const category of Object.values(auditResult.categories)) {
    for (const factor of category.factors) {
      const pct = factor.maxScore > 0 ? factor.score / factor.maxScore : 1;

      if (pct >= 0.7) continue;

      const priority: 'high' | 'medium' | 'low' =
        pct < 0.3 ? 'high' : pct < 0.5 ? 'medium' : 'low';

      const recText = RECOMMENDATION_MAP[factor.name]
        || `Review and improve "${factor.name}" based on best practices for generative engine readiness.`;

      recommendations.push({
        category: category.name,
        factor: factor.name,
        currentValue: factor.value,
        priority,
        recommendation: recText,
      });
    }
  }

  // Sort by priority (high first), then by factor name for determinism
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => {
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pd !== 0) return pd;
    return a.factor.localeCompare(b.factor);
  });

  return recommendations;
}
