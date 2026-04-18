import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import type { AnalyzerResultType } from "../analyzer/schema.js";
import { type AiseoConfigType, type DiffEntryType } from "../config/schema.js";
import { updateConfig } from "../config/service.js";
import { fileExists } from "../../utils/fs.js";
import { slugifyUrl } from "../../utils/url.js";

export const DEFAULT_HISTORY_DIR = "./audits";

export type RecordRunInputs = {
  result: AnalyzerResultType;
  configPath: string;
  existingDiff: AiseoConfigType["diff"];
  historyDir?: string;
  explicitOutPath?: string;
};

export type RecordRunOutcome = {
  writtenPath: string;
  baselineEntry: DiffEntryType | null;
  notifications: string[];
};

export async function recordAuditRun(
  inputs: RecordRunInputs,
): Promise<RecordRunOutcome> {
  const { result, configPath, existingDiff, explicitOutPath } = inputs;
  const historyDir = inputs.historyDir ?? DEFAULT_HISTORY_DIR;

  const resolvedOutPath = explicitOutPath
    ? resolve(explicitOutPath)
    : resolve(defaultOutputPath(historyDir, result));
  const historyDirExisted = await fileExists(historyDir);

  await mkdir(dirname(resolvedOutPath), { recursive: true });
  await writeFile(resolvedOutPath, JSON.stringify(result, null, 2), "utf-8");

  const priorEntries = existingDiff?.[result.url] ?? [];
  const baselineEntry =
    priorEntries.length > 0 ? priorEntries[priorEntries.length - 1] : null;

  const newEntry: DiffEntryType = {
    path: resolvedOutPath,
    timestamp: result.analyzedAt,
    score: result.overallScore,
  };

  const mergedDiff: NonNullable<AiseoConfigType["diff"]> = {
    ...(existingDiff ?? {}),
    [result.url]: [...priorEntries, newEntry],
  };

  await updateConfig(configPath, { diff: mergedDiff });

  return {
    writtenPath: resolvedOutPath,
    baselineEntry,
    notifications: buildNotifications({
      historyDir,
      historyDirExisted,
      configPath,
      savedRelativePath: relativeTo(configPath, resolvedOutPath),
      url: result.url,
      totalEntries: mergedDiff[result.url].length,
    }),
  };
}

export async function loadBaselineResult(
  path: string,
): Promise<AnalyzerResultType> {
  if (!(await fileExists(path))) {
    throw new Error(
      `Baseline audit file not found at "${path}". Pass --baseline with an existing path, or run --diff twice to establish one.`,
    );
  }
  const content = await readFile(path, "utf-8");
  return JSON.parse(content) as AnalyzerResultType;
}

function defaultOutputPath(
  historyDir: string,
  result: AnalyzerResultType,
): string {
  const slug = slugifyUrl(result.url);
  const stamp = timestampSlug(result.analyzedAt);
  return `${historyDir.replace(/\/$/, "")}/${slug}-${stamp}.json`;
}

function timestampSlug(iso: string): string {
  return iso.replace(/[:.]/g, "-").replace(/Z$/, "Z");
}

function relativeTo(configPath: string, target: string): string {
  return relative(dirname(resolve(configPath)), target) || target;
}

function buildNotifications(inputs: {
  historyDir: string;
  historyDirExisted: boolean;
  configPath: string;
  savedRelativePath: string;
  url: string;
  totalEntries: number;
}): string[] {
  const notifications: string[] = [];

  if (!inputs.historyDirExisted) {
    notifications.push(
      `Created ${inputs.historyDir}/ to store audit history. Add it to .gitignore, or commit it to track AI SEO over time.`,
    );
  }

  notifications.push(
    `Updated ${inputs.configPath}: diff["${inputs.url}"] ← ${inputs.savedRelativePath} (${inputs.totalEntries} ${inputs.totalEntries === 1 ? "entry" : "entries"} tracked)`,
  );

  if (inputs.totalEntries === 1) {
    notifications.push(
      `Baseline saved. Run --diff again to compare against this run.`,
    );
  }

  return notifications;
}
