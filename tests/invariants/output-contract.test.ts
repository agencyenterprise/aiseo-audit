import { describe, expect, it, vi } from "vitest";
import { handleAuditUrl } from "../../src/mcp/tools.js";
import {
  renderReport,
  renderSitemapReport,
} from "../../src/modules/report/service.js";
import type { SitemapResultType } from "../../src/modules/sitemap/schema.js";
import { makeConfig } from "../helpers/config.js";
import {
  makeRecommendation,
  makeResult,
  makeStages,
} from "../helpers/results.js";

function makeSitemapResult(): SitemapResultType {
  return {
    sitemapUrl: "https://example.com/sitemap.xml",
    signalsBase: "https://example.com",
    analyzedAt: "2026-02-11T12:00:00.000Z",
    totalUrls: 2,
    succeededCount: 2,
    failedCount: 0,
    averageScore: 72,
    averageGrade: "B-",
    categoryAverages: {
      contentExtractability: { name: "Content Extractability", averagePct: 80 },
    },
    urlResults: [
      { status: "success", result: makeResult() },
      {
        status: "success",
        result: makeResult({ url: "https://example.com/other" }),
      },
    ],
    meta: { version: "2.0.0", analysisDurationMs: 500 },
  };
}

function makeContractResult() {
  return makeResult({
    stages: makeStages(),
    recommendations: [
      makeRecommendation({ auditPoints: 10 }),
      makeRecommendation({
        category: "Content Extractability",
        factor: "Word Count",
        priority: "low",
        recommendation: "Add more content.",
        auditPoints: 5,
      }),
    ],
  });
}

describe("single result JSON contract", () => {
  const output = renderReport(makeContractResult(), { format: "json" });
  const parsed = JSON.parse(output);

  it("carries a numeric overallScore and a string grade", () => {
    expect(typeof parsed.overallScore).toBe("number");
    expect(typeof parsed.grade).toBe("string");
  });

  it("carries the new tldr shape", () => {
    expect(typeof parsed.tldr.score).toBe("number");
    expect(typeof parsed.tldr.grade).toBe("string");
    expect(Array.isArray(parsed.tldr.topFixes)).toBe(true);
    expect(parsed.tldr.topFixes.length).toBeGreaterThan(0);
    for (const fix of parsed.tldr.topFixes) {
      expect(typeof fix.factor).toBe("string");
      expect(typeof fix.category).toBe("string");
      expect(typeof fix.auditPoints).toBe("number");
    }
    expect(typeof parsed.tldr.note).toBe("string");
  });

  it("summarizes stages inside the tldr when the result carries stages", () => {
    expect(parsed.tldr.stages.technicalEligibility.status).toBe("pass");
    expect(typeof parsed.tldr.stages.retrievalAlignment.pct).toBe("number");
    expect(Array.isArray(parsed.tldr.stages.citationFitness.trippedGates)).toBe(
      true,
    );
  });

  it("never mentions projected scores or expected gains anywhere", () => {
    expect(output).not.toContain("projectedScore");
    expect(output).not.toContain("projectedGrade");
    expect(output).not.toContain("expectedGain");
  });
});

describe("sitemap result JSON contract", () => {
  const output = renderSitemapReport(makeSitemapResult(), { format: "json" });
  const parsed = JSON.parse(output);

  it("carries a numeric averageScore and a string averageGrade", () => {
    expect(typeof parsed.averageScore).toBe("number");
    expect(typeof parsed.averageGrade).toBe("string");
  });

  it("never mentions projected scores or expected gains anywhere", () => {
    expect(output).not.toContain("projectedScore");
    expect(output).not.toContain("projectedGrade");
    expect(output).not.toContain("expectedGain");
  });
});

describe("MCP output contract", () => {
  it("returns the raw analyzer result as JSON text", async () => {
    const result = makeContractResult();
    const analyzeUrl = vi.fn().mockResolvedValue(result);
    const loadConfig = vi.fn().mockResolvedValue(makeConfig());

    const response = await handleAuditUrl(
      { url: "https://example.com" },
      { analyzeUrl, loadConfig },
    );

    expect(response.content[0].type).toBe("text");
    const text = (response.content[0] as { type: "text"; text: string }).text;
    expect(JSON.parse(text)).toEqual(result);
  });
});
