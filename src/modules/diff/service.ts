import type { AnalyzerResultType } from "../analyzer/schema.js";
import { RESULT_SCHEMA_VERSION } from "../analyzer/constants.js";
import type { CategoryResultType } from "../audits/schema.js";
import { computeStages } from "../scoring/stages.js";
import { fingerprint } from "../analyzer/fingerprint.js";
import type { StageScoresType } from "../scoring/schema.js";
import type {
  CategoryDeltaType,
  DiffResultType,
  QueryDeltaType,
  StageDeltaType,
} from "./schema.js";

export function computeDiff(
  current: AnalyzerResultType,
  baseline: AnalyzerResultType,
): DiffResultType {
  const categoryKeys = new Set([
    ...Object.keys(current.categories),
    ...Object.keys(baseline.categories),
  ]);

  const categoryDeltas: Record<string, CategoryDeltaType> = {};
  for (const key of categoryKeys) {
    categoryDeltas[key] = deltaForCategory(
      key,
      current.categories[key as keyof typeof current.categories],
      baseline.categories[key as keyof typeof baseline.categories],
    );
  }

  return {
    url: current.url,
    currentScore: current.overallScore,
    baselineScore: baseline.overallScore,
    overallDelta: current.overallScore - baseline.overallScore,
    currentAnalyzedAt: current.analyzedAt,
    baselineAnalyzedAt: baseline.analyzedAt,
    categoryDeltas,
    stageDeltas: stageDeltasBetween(current, baseline),
    queryDeltas: queryDeltasBetween(current, baseline),
    comparison: compareInputs(current, baseline),
    newBlockers: blockersOnlyIn(current, baseline),
    resolvedBlockers: blockersOnlyIn(baseline, current),
    findingChanges: findingChanges(current, baseline),
    crossVersion:
      (baseline.schemaVersion ?? 1) !== RESULT_SCHEMA_VERSION || undefined,
  };
}

function findingChanges(
  current: AnalyzerResultType,
  baseline: AnalyzerResultType,
) {
  if (!current.findings || !baseline.findings) return undefined;
  const active = (result: AnalyzerResultType) =>
    new Set(
      result
        .findings!.filter(
          (finding) =>
            finding.severity === "error" || finding.severity === "warning",
        )
        .map((finding) => finding.ruleId),
    );
  const now = active(current);
  const before = active(baseline);
  return {
    introduced: [...now].filter((id) => !before.has(id)),
    resolved: [...before].filter((id) => !now.has(id)),
    persisting: [...now].filter((id) => before.has(id)),
  };
}

function compareInputs(
  current: AnalyzerResultType,
  baseline: AnalyzerResultType,
) {
  const reasons: string[] = [];
  const warnings: string[] = [];
  if (current.url !== baseline.url) reasons.push("Page URL changed.");
  if (
    (current.meta.scoringVersion ?? current.meta.version) !==
    (baseline.meta.scoringVersion ?? baseline.meta.version)
  ) {
    reasons.push("Scoring version changed; establish a new baseline.");
  }
  if ((current.schemaVersion ?? 1) !== (baseline.schemaVersion ?? 1))
    reasons.push("Report schema version changed.");
  if (
    (current.meta.source ?? "network") !== (baseline.meta.source ?? "network")
  )
    reasons.push("Input mode changed between fetched and supplied HTML.");
  if (current.signalsBase !== baseline.signalsBase)
    reasons.push("Domain signals source changed.");
  const crawlerObservation = (result: AnalyzerResultType) =>
    result.rawData.crawlerAccess?.unknown.length === 0;
  if (crawlerObservation(current) !== crawlerObservation(baseline))
    reasons.push("Crawler access observation coverage changed.");
  if (current.rawData.domainDetected !== baseline.rawData.domainDetected)
    reasons.push("Detected page profile changed.");
  if (
    current.rawData.language?.supported !==
      baseline.rawData.language?.supported ||
    current.rawData.language?.code !== baseline.rawData.language?.code
  )
    reasons.push("Language or supported scoring coverage changed.");
  if (configFingerprint(current) !== configFingerprint(baseline))
    reasons.push(
      "Scoring configuration changed (weights, queries, domain, or engine).",
    );
  if (!current.meta.weights || !baseline.meta.weights)
    reasons.push("A report lacks scoring configuration metadata.");
  const currentDate =
    current.meta.evaluationDate ?? current.analyzedAt.slice(0, 10);
  const baselineDate =
    baseline.meta.evaluationDate ?? baseline.analyzedAt.slice(0, 10);
  if (currentDate !== baselineDate)
    warnings.push(
      "Evaluation date changed; freshness can change without a content edit.",
    );
  if (!current.meta.inputFingerprint || !baseline.meta.inputFingerprint)
    warnings.push(
      "A report lacks an input fingerprint; identical fetched inputs cannot be verified.",
    );
  return { comparable: reasons.length === 0, reasons, warnings };
}

function configFingerprint(result: AnalyzerResultType): string {
  return (
    result.meta.configurationFingerprint ??
    fingerprint({
      weights: result.meta.effectiveWeights ?? result.meta.weights,
      stageWeights: result.meta.stageWeights,
      queries: result.meta.queries ?? [],
      domain: result.meta.domain ?? "auto",
      engine: result.meta.engine ?? "generic",
    })
  );
}

function blockersOnlyIn(
  first: AnalyzerResultType,
  second: AnalyzerResultType,
): string[] {
  const previous = new Set(
    stagesOf(second)?.technicalEligibility.blockers ?? [],
  );
  return (stagesOf(first)?.technicalEligibility.blockers ?? []).filter(
    (blocker) => !previous.has(blocker),
  );
}

function deltaForCategory(
  key: string,
  current: CategoryResultType | undefined,
  baseline: CategoryResultType | undefined,
): CategoryDeltaType {
  const name = current?.name ?? baseline?.name ?? key;
  const currentScore = current?.score ?? 0;
  const baselineScore = baseline?.score ?? 0;
  const maxScore = Math.max(current?.maxScore ?? 0, baseline?.maxScore ?? 0);

  return {
    name,
    currentScore,
    baselineScore,
    maxScore,
    delta: currentScore - baselineScore,
    currentPct: pctOf(current),
    baselinePct: pctOf(baseline),
  };
}

function pctOf(category: CategoryResultType | undefined): number | null {
  if (!category || category.maxScore === 0) return null;
  return Math.round((category.score / category.maxScore) * 100);
}

function stageDeltasBetween(
  current: AnalyzerResultType,
  baseline: AnalyzerResultType,
): Record<string, StageDeltaType> | undefined {
  const currentStages = stagesOf(current);
  const baselineStages = stagesOf(baseline);
  if (!currentStages || !baselineStages) return undefined;

  const deltas: Record<string, StageDeltaType> = {};
  for (const stageName of Object.keys(currentStages) as Array<
    keyof StageScoresType
  >) {
    const currentPct = currentStages[stageName].pct;
    const baselinePct = baselineStages[stageName].pct;
    deltas[stageName] = {
      currentPct,
      baselinePct,
      delta:
        currentPct !== null && baselinePct !== null
          ? currentPct - baselinePct
          : null,
    };
  }
  return deltas;
}

function stagesOf(result: AnalyzerResultType): StageScoresType | undefined {
  if (result.stages) return result.stages;
  return computeStages(result.categories, result.rawData, {
    queries: result.meta.queries,
    domain: result.meta.domain,
  });
}

const QUERY_REGRESSION_EPSILON = 0.05;

function queryDeltasBetween(
  current: AnalyzerResultType,
  baseline: AnalyzerResultType,
): QueryDeltaType[] | undefined {
  const currentQueries = current.rawData.queryAlignment?.queries;
  const baselineQueries = baseline.rawData.queryAlignment?.queries;
  if (!currentQueries || !baselineQueries) return undefined;

  const baselineByQuery = new Map(
    baselineQueries.map((entry) => [entry.query, entry]),
  );

  const deltas = currentQueries.flatMap((entry) => {
    const baselineEntry = baselineByQuery.get(entry.query);
    if (!baselineEntry) return [];
    const currentCoverage = bestCoverageOf(entry);
    const baselineCoverage = bestCoverageOf(baselineEntry);
    const delta = currentCoverage - baselineCoverage;
    return [
      {
        query: entry.query,
        currentCoverage,
        baselineCoverage,
        delta,
        regressed: delta < -QUERY_REGRESSION_EPSILON,
      },
    ];
  });

  return deltas.length > 0 ? deltas : undefined;
}

function bestCoverageOf(entry: {
  structuralCoverage: number;
  bodyCoverage: number;
}): number {
  return Math.max(entry.structuralCoverage, entry.bodyCoverage);
}
