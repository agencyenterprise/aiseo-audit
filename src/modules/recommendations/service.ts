import type { FactorNameType } from "../audits/factor-names.js";
import type { AuditResultType, FactorResultType } from "../audits/schema.js";
import { CRITICAL_FACTOR_PCT, GOOD_FACTOR_PCT } from "../scoring/service.js";
import {
  RECOMMENDATION_BUILDERS,
  type RecommendationDirectionType,
} from "./constants.js";
import { pageReadsAsPolished } from "./polish.js";
import type { RecommendationType } from "./schema.js";
import { FACTOR_REGISTRY } from "../audits/stage.js";
import type { CategoryWeightType, StageWeightType } from "../config/schema.js";
import type { StageScoresType } from "../scoring/schema.js";
import type { ExtractedPageType } from "../extractor/schema.js";
import { RULE_IDS } from "../findings/rules.js";
import { locateFactor } from "../findings/locations.js";

type RecommendationOptions = {
  weights?: CategoryWeightType;
  stageWeights?: StageWeightType;
  stages?: StageScoresType;
  page?: ExtractedPageType;
};

export function generateRecommendations(
  auditResult: AuditResultType,
  options: RecommendationOptions = {},
): RecommendationType[] {
  const polished = pageReadsAsPolished(auditResult.rawData);
  const drafted = draftRecommendations(auditResult, polished, options);
  const coordinated = mergeOpposingDirections(drafted);

  coordinated.sort(compareRecommendations);

  return coordinated;
}

export function compareRecommendations(
  a: RecommendationType,
  b: RecommendationType,
): number {
  const blocker = Number(!!b.blocker) - Number(!!a.blocker);
  if (blocker !== 0) return blocker;
  const evidence = {
    supported: 0,
    conditional: 1,
    heuristic: 2,
    experimental: 3,
    diagnostic: 4,
  };
  const evidenceDifference =
    evidence[a.evidence ?? "heuristic"] - evidence[b.evidence ?? "heuristic"];
  if (evidenceDifference !== 0) return evidenceDifference;
  const points =
    (b.weightedAuditPoints ?? b.auditPoints ?? 0) -
    (a.weightedAuditPoints ?? a.auditPoints ?? 0);
  if (points !== 0) return points;
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return (
    priorityOrder[a.priority] - priorityOrder[b.priority] ||
    a.factor.localeCompare(b.factor)
  );
}

function draftRecommendations(
  auditResult: AuditResultType,
  polished: boolean,
  options: RecommendationOptions,
): RecommendationType[] {
  const recommendations: RecommendationType[] = [];

  for (const category of Object.values(auditResult.categories)) {
    for (const factor of category.factors) {
      if (isNotApplicableToThisPage(factor)) continue;
      const name = factor.name as FactorNameType;
      const stage = FACTOR_REGISTRY[name]?.stage;
      const blocker =
        options.stages?.technicalEligibility.blockers.includes(factor.name) ??
        false;
      const weight =
        options.stageWeights && stage
          ? options.stageWeights[stage]
          : (options.weights?.[category.key] ?? 1);
      if (weight === 0 && !blocker) continue;

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

      if (polished && output.direction === "simplify") continue;

      const auditPoints = Math.max(0, factor.maxScore - factor.score);

      recommendations.push({
        category: category.name,
        factor: factor.name,
        currentValue: factor.value,
        priority,
        recommendation: output.text,
        auditPoints,
        weightedAuditPoints: auditPoints * weight,
        ruleId: RULE_IDS[name],
        stage,
        blocker,
        ...(options.page && { location: locateFactor(options.page, name) }),
        ...(output.direction && { direction: output.direction }),
        ...(factor.evidence && { evidence: factor.evidence }),
        ...(factor.citations &&
          factor.citations.length > 0 && { citations: factor.citations }),
        ...(output.steps && { steps: output.steps }),
        ...(output.codeExample && { codeExample: output.codeExample }),
        ...(output.learnMoreUrl && { learnMoreUrl: output.learnMoreUrl }),
      });
    }
  }

  return recommendations;
}

function isNotApplicableToThisPage(factor: FactorResultType): boolean {
  return factor.status === "neutral" || factor.status === "info";
}

const OPPOSING_DIRECTIONS: ReadonlyArray<
  [RecommendationDirectionType, RecommendationDirectionType]
> = [
  ["simplify", "deepen"],
  ["shorten", "expand"],
  ["add", "remove"],
];

function mergeOpposingDirections(
  recommendations: RecommendationType[],
): RecommendationType[] {
  let coordinated = recommendations;
  for (const [first, second] of OPPOSING_DIRECTIONS) {
    coordinated = mergePairIfBothPresent(coordinated, first, second);
  }
  return coordinated;
}

function mergePairIfBothPresent(
  recommendations: RecommendationType[],
  first: RecommendationDirectionType,
  second: RecommendationDirectionType,
): RecommendationType[] {
  const firstSide = recommendations.filter((rec) => rec.direction === first);
  const secondSide = recommendations.filter((rec) => rec.direction === second);
  if (firstSide.length === 0 || secondSide.length === 0) {
    return recommendations;
  }

  const kept = recommendations.filter(
    (rec) => rec.direction !== first && rec.direction !== second,
  );
  kept.push(conflictRecommendation(firstSide, secondSide, first, second));
  return kept;
}

function conflictRecommendation(
  firstSide: RecommendationType[],
  secondSide: RecommendationType[],
  first: RecommendationDirectionType,
  second: RecommendationDirectionType,
): RecommendationType {
  const priorities = ["high", "medium", "low"] as const;
  const highest = priorities.find((level) =>
    [...firstSide, ...secondSide].some((rec) => rec.priority === level),
  );
  const nameList = (recs: RecommendationType[]) =>
    recs.map((rec) => rec.factor).join(", ");

  return {
    category: firstSide[0].category,
    factor: `Direction conflict: ${first} vs ${second}`,
    currentValue: `${nameList(firstSide)} pull toward ${first}; ${nameList(secondSide)} pull toward ${second}`,
    priority: highest ?? "medium",
    recommendation: `These recommendations pull the page in opposite directions. ${nameList(firstSide)} would ${first} the content while ${nameList(secondSide)} would ${second} it. Optimizing for one audience commonly degrades others, so decide which audience and query set this page serves, then apply only that side.`,
    citations: ["if-geo-findings-acl-2026"],
  };
}
