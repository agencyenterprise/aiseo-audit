import type { FactorNameType } from "../audits/factor-names.js";
import type {
  AuditRawDataType,
  CategoryResultType,
  FactorResultType,
} from "../audits/schema.js";
import {
  CITATION_GATES,
  FACTOR_REGISTRY,
  resolveDomain,
  type GateContextType,
  type StageNameType,
} from "../audits/stage.js";
import { isScorable } from "./service.js";
import type {
  GateResultType,
  StageScoresType,
  StageScoreType,
} from "./schema.js";

export type ComputeStagesOptionsType = {
  queries?: string[];
  domain?: "auto" | "product" | "informational";
};

export function computeStages(
  categories: Record<string, CategoryResultType>,
  rawData: Partial<AuditRawDataType>,
  options: ComputeStagesOptionsType = {},
): StageScoresType {
  const factors = Object.values(categories).flatMap(
    (category) => category.factors,
  );
  const rollup = rollupByStage(factors);

  const blockers = eligibilityBlockers(factors, rawData);
  const eligibilityStatus = blockers.length > 0 ? "fail" : "pass";

  const gateContext: GateContextType = {
    rawData,
    queries: options.queries ?? [],
    domain: resolveDomain(options.domain ?? "auto", rawData),
  };
  const gates = evaluateGates(gateContext);
  const cap = lowestTrippedCap(gates);

  const suppressDownstream = eligibilityStatus === "fail";
  const retrievalAlignment = finalizeStage(
    rollup.retrievalAlignment,
    suppressDownstream,
  );
  const provenance = finalizeStage(rollup.provenance, suppressDownstream);
  const citationFitness = finalizeStage(
    rollup.citationFitness,
    suppressDownstream,
  );

  return {
    technicalEligibility: {
      ...finalizeStage(rollup.technicalEligibility, false),
      status: eligibilityStatus,
      blockers,
    },
    retrievalAlignment,
    citationFitness: {
      ...citationFitness,
      uncappedPct: citationFitness.pct,
      pct:
        citationFitness.pct === null
          ? null
          : Math.min(citationFitness.pct, cap),
      gates,
    },
    provenance,
  };
}

type StageRollupType = Record<
  StageNameType,
  { score: number; maxScore: number }
>;

function rollupByStage(factors: FactorResultType[]): StageRollupType {
  const rollup: StageRollupType = {
    technicalEligibility: { score: 0, maxScore: 0 },
    retrievalAlignment: { score: 0, maxScore: 0 },
    citationFitness: { score: 0, maxScore: 0 },
    provenance: { score: 0, maxScore: 0 },
  };

  for (const factor of factors) {
    if (!isScorable(factor)) continue;
    const meta = FACTOR_REGISTRY[factor.name as FactorNameType];
    if (!meta) continue;
    rollup[meta.stage].score += factor.score;
    rollup[meta.stage].maxScore += factor.maxScore;
  }

  return rollup;
}

function finalizeStage(
  totals: { score: number; maxScore: number },
  suppressed: boolean,
): StageScoreType {
  if (suppressed) {
    return { ...totals, pct: null, suppressed: true };
  }
  return {
    ...totals,
    pct:
      totals.maxScore > 0
        ? Math.round((totals.score / totals.maxScore) * 100)
        : null,
    suppressed: false,
  };
}

function eligibilityBlockers(
  factors: FactorResultType[],
  rawData: Partial<AuditRawDataType>,
): string[] {
  const blockers = factors
    .filter((factor) => {
      const meta = FACTOR_REGISTRY[factor.name as FactorNameType];
      return meta?.blocking && factor.status === "critical";
    })
    .map((factor) => factor.name);

  if (everyKnownCrawlerIsBlocked(rawData)) {
    blockers.push("AI Crawler Access");
  }

  return blockers;
}

function everyKnownCrawlerIsBlocked(
  rawData: Partial<AuditRawDataType>,
): boolean {
  const access = rawData.crawlerAccess;
  if (!access) return false;
  return (
    access.blocked.length > 0 &&
    access.allowed.length === 0 &&
    access.unknown.length === 0
  );
}

function evaluateGates(context: GateContextType): GateResultType[] {
  return CITATION_GATES.map((gate) => ({
    id: gate.id,
    label: gate.label,
    status: !gate.appliesWhen(context)
      ? "not_applicable"
      : gate.isTripped(context)
        ? "tripped"
        : "pass",
    capPct: gate.capPct,
    citations: gate.citations,
  }));
}

function lowestTrippedCap(gates: GateResultType[]): number {
  return gates
    .filter((gate) => gate.status === "tripped")
    .reduce((lowest, gate) => Math.min(lowest, gate.capPct), 100);
}
