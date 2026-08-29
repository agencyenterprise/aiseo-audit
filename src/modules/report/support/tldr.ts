import type { AnalyzerResultType } from "../../analyzer/schema.js";
import type { RecommendationType } from "../../recommendations/schema.js";
import type { StageScoresType } from "../../scoring/schema.js";

export type TopFixType = {
  factor: string;
  category: string;
  auditPoints: number;
};

export type TldrStagesType = {
  technicalEligibility: { status: "pass" | "fail"; pct: number | null };
  retrievalAlignment: { pct: number | null };
  citationFitness: {
    pct: number | null;
    uncappedPct: number | null;
    trippedGates: string[];
  };
  provenance: { pct: number | null };
};

export type TldrType = {
  score: number;
  grade: string;
  topFixes: TopFixType[];
  stages: TldrStagesType | undefined;
  note: string;
};

export const TLDR_NOTE =
  "Audit points are internal audit weights, not additive citation-probability gains. Apply the top items, then re-measure.";

const TOP_FIX_COUNT = 3;

export function buildTldr(result: AnalyzerResultType): TldrType {
  return {
    score: result.overallScore,
    grade: result.grade,
    topFixes: selectTopFixes(result.recommendations),
    stages: summarizeStages(result.stages),
    note: TLDR_NOTE,
  };
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

function selectTopFixes(recommendations: RecommendationType[]): TopFixType[] {
  return [...recommendations]
    .sort((a, b) => {
      const byPriority =
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (byPriority !== 0) return byPriority;
      return (b.auditPoints ?? 0) - (a.auditPoints ?? 0);
    })
    .slice(0, TOP_FIX_COUNT)
    .map((rec) => ({
      factor: rec.factor,
      category: rec.category,
      auditPoints: rec.auditPoints ?? 0,
    }));
}

function summarizeStages(
  stages: StageScoresType | undefined,
): TldrStagesType | undefined {
  if (!stages) return undefined;
  return {
    technicalEligibility: {
      status: stages.technicalEligibility.status,
      pct: stages.technicalEligibility.pct,
    },
    retrievalAlignment: { pct: stages.retrievalAlignment.pct },
    citationFitness: {
      pct: stages.citationFitness.pct,
      uncappedPct: stages.citationFitness.uncappedPct,
      trippedGates: stages.citationFitness.gates
        .filter((gate) => gate.status === "tripped")
        .map((gate) => gate.label),
    },
    provenance: { pct: stages.provenance.pct },
  };
}
