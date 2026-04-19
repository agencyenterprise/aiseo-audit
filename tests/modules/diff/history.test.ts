import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AnalyzerResultType } from "../../../src/modules/analyzer/schema.js";
import type { DiffEntryType } from "../../../src/modules/config/schema.js";
import {
  loadBaselineResult,
  recordAuditRun,
} from "../../../src/modules/diff/history.js";

function makeResult(
  overrides: Partial<AnalyzerResultType> = {},
): AnalyzerResultType {
  return {
    url: "https://example.com",
    signalsBase: "https://example.com",
    analyzedAt: "2026-04-17T00:00:00.000Z",
    overallScore: 59,
    grade: "F",
    totalPoints: 100,
    maxPoints: 200,
    categories: {
      contentExtractability: {
        name: "Content Extractability",
        key: "contentExtractability",
        score: 50,
        maxScore: 60,
        factors: [],
      },
    },
    recommendations: [],
    rawData: { title: "", metaDescription: "", wordCount: 0 },
    meta: { version: "1.5.0", analysisDurationMs: 0 },
    ...overrides,
  };
}

describe("recordAuditRun", () => {
  const testDir = join(tmpdir(), `aiseo-history-test-${Date.now()}`);
  const configPath = join(testDir, "aiseo.config.json");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  it("writes the audit result to a default ./audits/ directory on first run", async () => {
    const result = makeResult();

    const outcome = await recordAuditRun({
      result,
      configPath,
      existingDiff: undefined,
      historyDir: join(testDir, "audits"),
    });

    expect(outcome.writtenPath).toMatch(/audits\/example-com-/);
    const saved = JSON.parse(await readFile(outcome.writtenPath, "utf-8"));
    expect(saved.url).toBe("https://example.com");
  });

  it("returns no baseline when this is the first run for the URL", async () => {
    const outcome = await recordAuditRun({
      result: makeResult(),
      configPath,
      existingDiff: undefined,
      historyDir: join(testDir, "audits"),
    });

    expect(outcome.baselineEntry).toBeNull();
  });

  it("appends a new entry to the diff history for the URL in the config", async () => {
    await recordAuditRun({
      result: makeResult(),
      configPath,
      existingDiff: undefined,
      historyDir: join(testDir, "audits"),
    });

    const config = JSON.parse(await readFile(configPath, "utf-8"));
    expect(config.diff["https://example.com"]).toHaveLength(1);
    expect(config.diff["https://example.com"][0].score).toBe(59);
  });

  it("returns the most recent entry as baseline on subsequent runs", async () => {
    const priorEntry: DiffEntryType = {
      path: join(testDir, "audits", "prior.json"),
      timestamp: "2026-04-15T00:00:00Z",
      score: 55,
    };
    await mkdir(join(testDir, "audits"), { recursive: true });
    await writeFile(
      priorEntry.path,
      JSON.stringify(makeResult({ overallScore: 55 })),
    );

    const outcome = await recordAuditRun({
      result: makeResult(),
      configPath,
      existingDiff: { "https://example.com": [priorEntry] },
      historyDir: join(testDir, "audits"),
    });

    expect(outcome.baselineEntry).toEqual(priorEntry);
  });

  it("never overwrites existing entries — appends monotonically", async () => {
    const priorEntry: DiffEntryType = {
      path: join(testDir, "audits", "prior.json"),
      timestamp: "2026-04-15T00:00:00Z",
      score: 55,
    };
    await mkdir(join(testDir, "audits"), { recursive: true });
    await writeFile(priorEntry.path, "{}");

    await recordAuditRun({
      result: makeResult(),
      configPath,
      existingDiff: { "https://example.com": [priorEntry] },
      historyDir: join(testDir, "audits"),
    });

    const config = JSON.parse(await readFile(configPath, "utf-8"));
    expect(config.diff["https://example.com"]).toHaveLength(2);
    expect(config.diff["https://example.com"][0]).toEqual(priorEntry);
  });

  it("always writes the baseline to historyDir, independent of CLI --out", async () => {
    const historyDir = join(testDir, "audits");

    const outcome = await recordAuditRun({
      result: makeResult(),
      configPath,
      existingDiff: undefined,
      historyDir,
    });

    expect(outcome.writtenPath.startsWith(historyDir)).toBe(true);
    expect(outcome.writtenPath).toMatch(/\.json$/);
  });

  it("includes a first-time notification when the history dir did not exist", async () => {
    const outcome = await recordAuditRun({
      result: makeResult(),
      configPath,
      existingDiff: undefined,
      historyDir: join(testDir, "audits"),
    });

    expect(outcome.notifications.some((n) => /Created.*audits/.test(n))).toBe(
      true,
    );
  });

  it("does NOT emit the first-time notification when the history dir already existed", async () => {
    const historyDir = join(testDir, "audits");
    await mkdir(historyDir, { recursive: true });

    const outcome = await recordAuditRun({
      result: makeResult(),
      configPath,
      existingDiff: undefined,
      historyDir,
    });

    expect(outcome.notifications.some((n) => /Created/.test(n))).toBe(false);
  });

  it("includes a notification that the config was updated", async () => {
    const outcome = await recordAuditRun({
      result: makeResult(),
      configPath,
      existingDiff: undefined,
      historyDir: join(testDir, "audits"),
    });

    expect(
      outcome.notifications.some((n) => n.includes("aiseo.config.json")),
    ).toBe(true);
  });
});

describe("loadBaselineResult", () => {
  const testDir = join(tmpdir(), `aiseo-baseline-test-${Date.now()}`);

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  it("reads a saved audit result from disk", async () => {
    const savedPath = join(testDir, "prior.json");
    await writeFile(
      savedPath,
      JSON.stringify(makeResult({ overallScore: 55 })),
    );

    const baseline = await loadBaselineResult(savedPath);

    expect(baseline.overallScore).toBe(55);
  });

  it("throws a descriptive error when the file is missing", async () => {
    await expect(
      loadBaselineResult(join(testDir, "missing.json")),
    ).rejects.toThrow(/Baseline/);
  });
});
