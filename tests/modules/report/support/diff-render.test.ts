import { describe, expect, it } from "vitest";
import type { AnalyzerResultType } from "../../../../src/modules/analyzer/schema.js";
import type { AiseoConfigType } from "../../../../src/modules/config/schema.js";
import type { DiffResultType } from "../../../../src/modules/diff/schema.js";
import {
  renderDiffReport,
  renderHistoryTimeline,
} from "../../../../src/modules/report/service.js";

function makeResult(): AnalyzerResultType {
  return {
    url: "https://example.com",
    signalsBase: "https://example.com",
    analyzedAt: "2026-04-17T00:00:00Z",
    overallScore: 72,
    grade: "C-",
    totalPoints: 300,
    maxPoints: 420,
    categories: {
      contentExtractability: {
        name: "Content Extractability",
        key: "contentExtractability",
        score: 55,
        maxScore: 60,
        factors: [],
      },
    },
    recommendations: [],
    rawData: { title: "", metaDescription: "", wordCount: 100 },
    meta: { version: "1.5.0", analysisDurationMs: 120 },
  };
}

function makeDiff(overallDelta: number): DiffResultType {
  return {
    url: "https://example.com",
    currentScore: 72,
    baselineScore: 72 - overallDelta,
    overallDelta,
    currentAnalyzedAt: "2026-04-17T00:00:00Z",
    baselineAnalyzedAt: "2026-04-10T00:00:00Z",
    categoryDeltas: {
      contentExtractability: {
        name: "Content Extractability",
        currentScore: 55,
        baselineScore: 50,
        maxScore: 60,
        delta: 5,
      },
    },
  };
}

describe("renderDiffReport", () => {
  describe("pretty format", () => {
    it("shows the overall delta with a + prefix when positive", () => {
      const output = renderDiffReport(makeResult(), makeDiff(8), {
        format: "pretty",
      });
      expect(output).toContain("+8");
    });

    it("shows the overall delta with a − prefix when negative", () => {
      const output = renderDiffReport(makeResult(), makeDiff(-5), {
        format: "pretty",
      });
      expect(output).toMatch(/[-−]5/);
    });

    it("includes category deltas with their names", () => {
      const output = renderDiffReport(makeResult(), makeDiff(8), {
        format: "pretty",
      });
      expect(output).toContain("Content Extractability");
    });

    it("still includes the full audit report", () => {
      const output = renderDiffReport(makeResult(), makeDiff(8), {
        format: "pretty",
      });
      expect(output).toContain("AI SEO Audit Report");
    });
  });

  describe("tldrOnly mode", () => {
    it("emits the diff block and TL;DR only, no full category breakdown", () => {
      const output = renderDiffReport(makeResult(), makeDiff(8), {
        format: "pretty",
        tldrOnly: true,
      });
      // Diff block still present
      expect(output).toContain("+8");
      // TL;DR header present
      expect(output).toContain("AI SEO Audit");
      // Full detailed report markers absent
      expect(output).not.toContain("Overall Score:");
      expect(output).not.toMatch(/\n\s*Recommendations:/);
    });

    it("honors tldrOnly in markdown", () => {
      const output = renderDiffReport(makeResult(), makeDiff(8), {
        format: "md",
        tldrOnly: true,
      });
      expect(output).toContain("## Changes since");
      expect(output).not.toContain("| Factor |");
    });

    it("honors tldrOnly in html", () => {
      const output = renderDiffReport(makeResult(), makeDiff(8), {
        format: "html",
        tldrOnly: true,
      });
      expect(output).toContain("diff-block");
      expect(output).not.toContain("gauges-row");
    });

    it("honors tldrOnly in json by slimming to tldr + diff only", () => {
      const output = renderDiffReport(makeResult(), makeDiff(8), {
        format: "json",
        tldrOnly: true,
      });
      const parsed = JSON.parse(output);
      expect(parsed.tldr).toBeDefined();
      expect(parsed.diff.overallDelta).toBe(8);
      expect(parsed.categories).toBeUndefined();
      expect(parsed.recommendations).toBeUndefined();
    });
  });

  describe("json format", () => {
    it("emits a diff field alongside the audit result", () => {
      const output = renderDiffReport(makeResult(), makeDiff(8), {
        format: "json",
      });
      const parsed = JSON.parse(output);
      expect(parsed.diff.overallDelta).toBe(8);
      expect(parsed.overallScore).toBe(72);
    });
  });
});

describe("renderHistoryTimeline", () => {
  const diffMap: NonNullable<AiseoConfigType["diff"]> = {
    "https://example.com": [
      { path: "audits/a.json", timestamp: "2026-04-01T00:00:00Z", score: 55 },
      { path: "audits/b.json", timestamp: "2026-04-10T00:00:00Z", score: 68 },
      { path: "audits/c.json", timestamp: "2026-04-17T00:00:00Z", score: 72 },
    ],
    "https://another.com": [
      { path: "audits/d.json", timestamp: "2026-04-15T00:00:00Z", score: 80 },
    ],
  };

  describe("pretty format", () => {
    it("renders one row per tracked URL", () => {
      const output = renderHistoryTimeline(diffMap, { format: "pretty" });
      expect(output).toContain("https://example.com");
      expect(output).toContain("https://another.com");
    });

    it("shows score progression for each URL in chronological order", () => {
      const output = renderHistoryTimeline(diffMap, { format: "pretty" });
      expect(output).toMatch(/55 → 68 → 72/);
    });

    it("renders a sparkline per URL", () => {
      const output = renderHistoryTimeline(diffMap, { format: "pretty" });
      expect(output).toMatch(/[▁▂▃▄▅▆▇█]/);
    });
  });

  describe("json format", () => {
    it("emits the full diff map as structured data", () => {
      const output = renderHistoryTimeline(diffMap, { format: "json" });
      const parsed = JSON.parse(output);
      expect(Object.keys(parsed.urls)).toHaveLength(2);
      expect(parsed.urls["https://example.com"]).toHaveLength(3);
    });
  });

  describe("markdown format", () => {
    it("renders a table with one row per URL", () => {
      const output = renderHistoryTimeline(diffMap, { format: "md" });
      expect(output).toContain("| URL |");
      expect(output).toContain("https://example.com");
    });
  });

  describe("html format", () => {
    it("renders a standalone HTML page with per-URL timelines", () => {
      const output = renderHistoryTimeline(diffMap, { format: "html" });
      expect(output).toMatch(/^<!DOCTYPE html>/);
      expect(output).toContain("https://example.com");
      expect(output).toContain("</html>");
    });
  });
});
