import { describe, expect, it } from "vitest";
import { analyzeHtml } from "../../src/modules/analyzer/service.js";
import { evaluateBenchmark } from "../../benchmarks/evaluate.mjs";

describe("public annotated benchmark", () => {
  it("preserves the manually labeled findings and applicability decisions", async () => {
    const report = await evaluateBenchmark(analyzeHtml);
    expect(report.cases.filter((entry) => !entry.passed)).toEqual([]);
    expect(report.caseCount).toBeGreaterThanOrEqual(8);
  });
});
