import type { FactorNameType } from "../audits/factor-names.js";
import type { AuditResultType, FactorResultType } from "../audits/schema.js";
import { CRITICAL_FACTOR_PCT, GOOD_FACTOR_PCT } from "../scoring/service.js";
import { RECOMMENDATION_BUILDERS } from "./constants.js";
import type { RecommendationType } from "./schema.js";

export function generateRecommendations(
  auditResult: AuditResultType,
): RecommendationType[] {
  const recommendations: RecommendationType[] = [];

  for (const category of Object.values(auditResult.categories)) {
    for (const factor of category.factors) {
      if (isNotApplicableToThisPage(factor)) continue;

      const pct = factor.maxScore > 0 ? factor.score / factor.maxScore : 1;

      if (pct >= GOOD_FACTOR_PCT) continue;

      const priority: "high" | "medium" | "low" =
        pct < CRITICAL_FACTOR_PCT ? "high" : pct < 0.5 ? "medium" : "low";

      const builder = RECOMMENDATION_BUILDERS[factor.name as FactorNameType];
      const output = builder
        ? builder(auditResult.rawData)
        : {
            text: `Review and improve "${factor.name}" based on best practices for AI search readiness.`,
          };

      const expectedGain = Math.max(0, factor.maxScore - factor.score);

      recommendations.push({
        category: category.name,
        factor: factor.name,
        currentValue: factor.value,
        priority,
        recommendation: output.text,
        expectedGain,
        ...(output.steps && { steps: output.steps }),
        ...(output.codeExample && { codeExample: output.codeExample }),
        ...(output.learnMoreUrl && { learnMoreUrl: output.learnMoreUrl }),
      });
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => {
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pd !== 0) return pd;
    return a.factor.localeCompare(b.factor);
  });

  return recommendations;
}

function isNotApplicableToThisPage(factor: FactorResultType): boolean {
  return factor.status === "neutral";
}
