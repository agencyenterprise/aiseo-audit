import type { AnalyzerResultType } from "../analyzer/schema.js";
import type { CategoryResultType } from "../audits/schema.js";
import type { CategoryDeltaType, DiffResultType } from "./schema.js";

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
      current.categories[key],
      baseline.categories[key],
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
  };
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
  };
}
