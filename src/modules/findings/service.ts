import { fingerprint } from "../analyzer/fingerprint.js";
import type { FactorNameType } from "../audits/factor-names.js";
import type { AuditResultType } from "../audits/schema.js";
import { FACTOR_REGISTRY } from "../audits/stage.js";
import type { ExtractedPageType } from "../extractor/schema.js";
import type { RecommendationType } from "../recommendations/schema.js";
import { GOOD_FACTOR_PCT, isScorable } from "../scoring/service.js";
import { locateFactor } from "./locations.js";
import { RULE_IDS } from "./rules.js";
import type { FindingType } from "./schema.js";

export function buildFindings(
  page: ExtractedPageType,
  audit: AuditResultType,
  recommendations: RecommendationType[],
): FindingType[] {
  return Object.values(audit.categories).flatMap((category) =>
    category.factors.map((factor) => {
      const name = factor.name as FactorNameType;
      const ruleId = RULE_IDS[name];
      const rule = FACTOR_REGISTRY[name];
      const recommendation = recommendations.find(
        (entry) => entry.factor === name,
      );
      const location = locateFactor(page, name);
      const scored = isScorable(factor);
      return {
        schemaVersion: 1,
        ruleId,
        fingerprint: fingerprint({ url: page.url, ruleId }),
        factor: name,
        category: category.key,
        stage: rule.stage,
        status: factor.status,
        severity:
          factor.status === "critical"
            ? "error"
            : factor.status === "needs_improvement"
              ? "warning"
              : factor.status === "info"
                ? "notice"
                : "none",
        scored,
        evidence: factor.evidence ?? rule.evidence,
        measured: factor.value,
        expected: scored
          ? {
              status: "good",
              minimumScore: Math.ceil(factor.maxScore * GOOD_FACTOR_PCT),
            }
          : undefined,
        location,
        message: recommendation?.recommendation ?? factor.value,
        steps: recommendation?.steps ?? [],
        citations: factor.citations ?? [],
        documentationUrl:
          "https://github.com/agencyenterprise/aiseo-audit/blob/main/docs/AUDIT_BREAKDOWN.md",
      };
    }),
  );
}
