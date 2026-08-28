import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileExists } from "../../utils/fs.js";
import { slugifyUrl } from "../../utils/url.js";
import {
  AnalyzerResultSchema,
  type AnalyzerResultType,
} from "../analyzer/schema.js";
import { type AiseoConfigType, type DiffEntryType } from "../config/schema.js";
import { updateConfig } from "../config/service.js";

export type RecordRunInputs = {
  result: AnalyzerResultType;
  configPath: string;
  existingDiff: AiseoConfigType["diff"];
  historyDir: string;
};

export type RecordRunOutcome = {
  writtenPath: string;
  baselineEntry: DiffEntryType | null;
  notifications: string[];
};

export async function recordAuditRun(
  inputs: RecordRunInputs,
): Promise<RecordRunOutcome> {
  const { result, configPath, existingDiff, historyDir } = inputs;

  const configDir = dirname(resolve(configPath));
  const resolvedHistoryDir = resolveAgainst(configDir, historyDir);
  const fileName = `${slugifyUrl(result.url)}-${timestampSlug(result.analyzedAt)}.json`;
  const resolvedOutPath = join(resolvedHistoryDir, fileName);
  const historyDirExisted = await fileExists(resolvedHistoryDir);

  await mkdir(resolvedHistoryDir, { recursive: true });
  await writeFile(resolvedOutPath, JSON.stringify(result, null, 2), "utf-8");

  const priorEntries = existingDiff?.[result.url] ?? [];
  const baselineEntry =
    priorEntries.length > 0 ? priorEntries[priorEntries.length - 1] : null;

  const newEntry: DiffEntryType = {
    path: relative(configDir, resolvedOutPath),
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
      savedRelativePath: newEntry.path,
      url: result.url,
      totalEntries: mergedDiff[result.url].length,
    }),
  };
}

export function resolveHistoryPath(
  entryPath: string,
  configPath: string,
): string {
  return resolveAgainst(dirname(resolve(configPath)), entryPath);
}

function resolveAgainst(baseDir: string, path: string): string {
  return isAbsolute(path) ? path : resolve(baseDir, path);
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Baseline file "${path}" is not valid JSON.`);
  }
  const validated = AnalyzerResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Baseline file "${path}" is not an aiseo-audit result (expected the JSON written by --diff or --json). ${validated.error.issues[0]?.message ?? ""}`,
    );
  }
  return validated.data;
}

function timestampSlug(iso: string): string {
  return iso.replace(/[:.]/g, "-");
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
