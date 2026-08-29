import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AiseoConfigSchema } from "../../src/modules/config/schema.js";
import { loadBaselineResult } from "../../src/modules/diff/history.js";
import { computeDiff } from "../../src/modules/diff/service.js";

const fixturePath = (name: string) => resolve(__dirname, "../fixtures", name);

const V1_BASELINES = [
  "baselines/v1.6.2-example-com.json",
  "baselines/v1.6.2-rich-page.json",
];

describe("v1.6.2 baseline compatibility", () => {
  it.each(V1_BASELINES)("loads %s through loadBaselineResult", async (name) => {
    const baseline = await loadBaselineResult(fixturePath(name));

    expect(baseline.overallScore).toBeGreaterThanOrEqual(0);
    expect(baseline.overallScore).toBeLessThanOrEqual(100);
    expect(baseline.grade).toMatch(/^[A-F][+-]?$/);
    expect(Object.keys(baseline.categories).length).toBeGreaterThan(0);
    expect(baseline.meta.version).toBe("1.6.2");
  });

  it("diffs a v1 baseline against another result without throwing", async () => {
    const baseline = await loadBaselineResult(
      fixturePath("baselines/v1.6.2-example-com.json"),
    );
    const current = await loadBaselineResult(
      fixturePath("baselines/v1.6.2-rich-page.json"),
    );

    const diff = computeDiff(current, baseline);

    expect(diff.overallDelta).toBe(
      current.overallScore - baseline.overallScore,
    );
    expect(Object.keys(diff.categoryDeltas).length).toBeGreaterThan(0);
  });
});

describe("v1 config compatibility", () => {
  it("parses a v1-only config file with all v1 fields intact", async () => {
    const raw = await readFile(
      fixturePath("configs/aiseo.config.v1.json"),
      "utf8",
    );

    const config = AiseoConfigSchema.parse(JSON.parse(raw));

    expect(config.timeout).toBe(30000);
    expect(config.failUnder).toBe(60);
    expect(config.weights.answerability).toBe(2);
    expect(config.weights.readabilityForCompression).toBe(0.5);
    expect(config.diff?.["https://example.com"]).toHaveLength(1);
  });
});
