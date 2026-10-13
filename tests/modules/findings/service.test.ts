import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";
import { analyzeHtml } from "../../../src/modules/analyzer/service.js";
import { AnalyzerResultSchema } from "../../../src/modules/analyzer/schema.js";
import { renderReport } from "../../../src/modules/report/service.js";
import { compareRecommendations } from "../../../src/modules/recommendations/service.js";
import { makeRecommendation } from "../../helpers/results.js";
import { computeDiff } from "../../../src/modules/diff/service.js";

const hedged =
  '<html lang="en"><head><title>Backup retention</title></head><body><main><h1>Backup retention</h1><p>This might possibly protect the files. It may perhaps save the records. The system could probably recover the data.</p></main></body></html>';

describe("actionable findings", () => {
  it("locates an actual passage and publishes a stable rule identifier", () => {
    const result = analyzeHtml({
      html: hedged,
      url: "https://example.com/guide",
    });
    const finding = result.findings!.find(
      (entry) => entry.ruleId === "grounding-signals.hedged-language",
    )!;
    expect(finding.severity).toBe("error");
    expect(finding.location.scope).toBe("element");
    expect(cheerio.load(hedged)(finding.location.selector!).text()).toBe(
      finding.location.excerpt,
    );
    expect(finding.expected?.minimumScore).toBeGreaterThan(0);
    expect(AnalyzerResultSchema.safeParse(result).success).toBe(true);
    const next = analyzeHtml({
      html: hedged.replace("might possibly", "might"),
      url: result.url,
    });
    expect(
      next.findings!.find((entry) => entry.ruleId === finding.ruleId)
        ?.fingerprint,
    ).toBe(finding.fingerprint);
  });

  it("does not invent an element location for missing document-wide evidence", () => {
    const result = analyzeHtml({
      html: hedged,
      url: "https://example.com/guide",
    });
    const finding = result.findings!.find(
      (entry) => entry.ruleId === "authority-context.author-attribution",
    )!;
    expect(finding.location).toEqual({ url: result.url, scope: "document" });
  });

  it("shows excerpts as escaped highlighted text, never executable page markup", () => {
    const html = hedged.replace(
      "This might",
      "&lt;script&gt;alert(1)&lt;/script&gt; This might",
    );
    const result = analyzeHtml({ html, url: "https://example.com/guide" });
    const report = renderReport(result, { format: "html" });
    expect(report).toContain("<mark>&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(report).not.toContain("<script>alert(1)</script>");
  });

  it("ranks blockers before stronger evidence and then respects evidence and weights", () => {
    const recommendations = [
      makeRecommendation({
        factor: "Heuristic",
        evidence: "heuristic",
        weightedAuditPoints: 100,
      }),
      makeRecommendation({
        factor: "Supported",
        evidence: "supported",
        weightedAuditPoints: 1,
      }),
      makeRecommendation({
        factor: "Weighted",
        evidence: "supported",
        weightedAuditPoints: 10,
      }),
      makeRecommendation({
        factor: "Blocker",
        blocker: true,
        evidence: "heuristic",
        weightedAuditPoints: 0,
      }),
    ].sort(compareRecommendations);
    expect(recommendations.map((entry) => entry.factor)).toEqual([
      "Blocker",
      "Weighted",
      "Supported",
      "Heuristic",
    ]);
  });

  it("does not recommend work in a zero-weight category", () => {
    const result = analyzeHtml(
      { html: hedged, url: "https://example.com" },
      { weights: { groundingSignals: 0 } },
    );
    expect(
      result.recommendations.some(
        (entry) => entry.category === "Grounding Signals",
      ),
    ).toBe(false);
  });

  it("tracks resolved rule findings across edits", () => {
    const options = {
      url: "https://example.com",
      evaluationDate: "2026-01-01",
    };
    const baseline = analyzeHtml({ ...options, html: hedged });
    const current = analyzeHtml({
      ...options,
      html: hedged
        .replace("might possibly protect", "protects")
        .replace("may perhaps save", "saves")
        .replace("could probably recover", "recovers"),
    });
    expect(computeDiff(current, baseline).findingChanges?.resolved).toContain(
      "grounding-signals.hedged-language",
    );
  });
});
