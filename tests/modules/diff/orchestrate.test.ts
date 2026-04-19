import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AnalyzerResultType } from "../../../src/modules/analyzer/schema.js";
import type { AiseoConfigType } from "../../../src/modules/config/schema.js";
import { orchestrateDiff } from "../../../src/modules/diff/orchestrate.js";

function makeResult(
  overallScore: number,
  url = "https://example.com",
): AnalyzerResultType {
  return {
    url,
    signalsBase: url,
    analyzedAt: new Date().toISOString(),
    overallScore,
    grade: overallScore >= 90 ? "A" : "D",
    totalPoints: 0,
    maxPoints: 100,
    categories: {
      contentExtractability: {
        name: "Content Extractability",
        key: "contentExtractability",
        score: overallScore,
        maxScore: 100,
        factors: [],
      },
    },
    recommendations: [],
    rawData: { title: "", metaDescription: "", wordCount: 0 },
    meta: { version: "1.5.0", analysisDurationMs: 0 },
  };
}

function makeConfig(diff?: AiseoConfigType["diff"]): AiseoConfigType {
  return {
    timeout: 45000,
    userAgent: "test",
    format: "pretty",
    weights: {
      contentExtractability: 1,
      contentStructure: 1,
      answerability: 1,
      entityClarity: 1,
      groundingSignals: 1,
      authorityContext: 1,
      readabilityForCompression: 1,
    },
    diff,
  };
}

describe("orchestrateDiff", () => {
  const testDir = join(tmpdir(), `aiseo-orchestrate-${Date.now()}`);
  const configPath = join(testDir, "aiseo.config.json");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  it("returns no diff on first run and records a baseline", async () => {
    const outcome = await orchestrateDiff({
      result: makeResult(59),
      config: makeConfig(),
      configPath,
      historyDir: join(testDir, "audits"),
    });

    expect(outcome.diff).toBeNull();
    const savedConfig = JSON.parse(await readFile(configPath, "utf-8"));
    expect(savedConfig.diff["https://example.com"]).toHaveLength(1);
  });

  it("returns a diff on the second run", async () => {
    const priorPath = join(testDir, "audits", "prior.json");
    await mkdir(join(testDir, "audits"), { recursive: true });
    await writeFile(priorPath, JSON.stringify(makeResult(55)));

    const outcome = await orchestrateDiff({
      result: makeResult(68),
      config: makeConfig({
        "https://example.com": [
          { path: priorPath, timestamp: "2026-04-10T00:00:00Z", score: 55 },
        ],
      }),
      configPath,
      historyDir: join(testDir, "audits"),
    });

    expect(outcome.diff).not.toBeNull();
    expect(outcome.diff?.overallDelta).toBe(13);
  });

  it("loads an explicit baseline when baselinePath is provided", async () => {
    const explicitBaseline = join(testDir, "manual-baseline.json");
    await writeFile(explicitBaseline, JSON.stringify(makeResult(40)));

    const outcome = await orchestrateDiff({
      result: makeResult(70),
      config: makeConfig(),
      configPath,
      historyDir: join(testDir, "audits"),
      baselinePath: explicitBaseline,
    });

    expect(outcome.diff).not.toBeNull();
    expect(outcome.diff?.overallDelta).toBe(30);
  });

  it("does not record a new history entry when baselinePath is used", async () => {
    const explicitBaseline = join(testDir, "manual-baseline.json");
    await writeFile(explicitBaseline, JSON.stringify(makeResult(40)));

    await orchestrateDiff({
      result: makeResult(70),
      config: makeConfig(),
      configPath,
      historyDir: join(testDir, "audits"),
      baselinePath: explicitBaseline,
    });

    // No config was created because no --diff history recording occurred.
    const configExists = await readFile(configPath, "utf-8").catch(() => null);
    expect(configExists).toBeNull();
  });

  it("honors historyDir from config when set", async () => {
    const customDir = join(testDir, "my-reports");

    const outcome = await orchestrateDiff({
      result: makeResult(59),
      config: { ...makeConfig(), historyDir: customDir },
      configPath,
    });

    expect(outcome.writtenPath).toMatch(/my-reports/);
  });

  it("loads a legacy v1.4.x baseline whose recommendations have no expectedGain", async () => {
    const legacyBaseline = join(testDir, "legacy-baseline.json");
    // This is the shape aiseo-audit@1.4.x wrote to disk: recommendations
    // without the expectedGain field that we introduced in 1.5.0.
    const legacyResult = {
      ...makeResult(40),
      recommendations: [
        {
          category: "Authority Context",
          factor: "Author Attribution",
          currentValue: "Not found",
          priority: "high",
          recommendation: "Add author information",
        },
      ],
    };
    await writeFile(legacyBaseline, JSON.stringify(legacyResult));

    const outcome = await orchestrateDiff({
      result: makeResult(70),
      config: makeConfig(),
      configPath,
      historyDir: join(testDir, "audits"),
      baselinePath: legacyBaseline,
    });

    expect(outcome.diff).not.toBeNull();
    expect(outcome.diff?.overallDelta).toBe(30);
  });
});
