import type { AnalyzerResultType } from "../analyzer/schema.js";
import type { AiseoConfigType } from "../config/schema.js";
import { loadBaselineResult, recordAuditRun } from "./history.js";
import type { DiffResultType } from "./schema.js";
import { computeDiff } from "./service.js";

export type OrchestrateDiffInputs = {
  result: AnalyzerResultType;
  config: AiseoConfigType;
  configPath: string;
  historyDir?: string;
  baselinePath?: string;
};

export type OrchestrateDiffOutcome = {
  diff: DiffResultType | null;
  writtenPath: string | null;
  notifications: string[];
};

export async function orchestrateDiff(
  inputs: OrchestrateDiffInputs,
): Promise<OrchestrateDiffOutcome> {
  if (inputs.baselinePath) {
    return orchestrateAgainstExplicitBaseline(inputs);
  }
  return orchestrateAgainstTrackedHistory(inputs);
}

async function orchestrateAgainstExplicitBaseline(
  inputs: OrchestrateDiffInputs,
): Promise<OrchestrateDiffOutcome> {
  const baseline = await loadBaselineResult(inputs.baselinePath!);
  const diff = computeDiff(inputs.result, baseline);
  return { diff, writtenPath: null, notifications: [] };
}

async function orchestrateAgainstTrackedHistory(
  inputs: OrchestrateDiffInputs,
): Promise<OrchestrateDiffOutcome> {
  const historyDir = inputs.historyDir ?? inputs.config.historyDir;

  const outcome = await recordAuditRun({
    result: inputs.result,
    configPath: inputs.configPath,
    existingDiff: inputs.config.diff,
    historyDir,
  });

  if (!outcome.baselineEntry) {
    return {
      diff: null,
      writtenPath: outcome.writtenPath,
      notifications: outcome.notifications,
    };
  }

  const baseline = await loadBaselineResult(outcome.baselineEntry.path);
  const diff = computeDiff(inputs.result, baseline);
  return {
    diff,
    writtenPath: outcome.writtenPath,
    notifications: outcome.notifications,
  };
}
