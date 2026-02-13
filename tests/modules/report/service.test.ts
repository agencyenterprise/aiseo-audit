import { describe, expect, it } from "vitest";
import type { AnalyzerResultType } from "../../../src/modules/analyzer/schema.js";
import { renderReport } from "../../../src/modules/report/service.js";

function makeMinimalResult(): AnalyzerResultType {
  return {
    url: "https://example.com",
    analyzedAt: "2026-02-11T12:00:00.000Z",
    overallScore: 72,
    grade: "B-",
    totalPoints: 302,
    maxPoints: 420,
    categories: {
      contentExtractability: {
        name: "Content Extractability",
        key: "contentExtractability",
        score: 50,
        maxScore: 60,
        factors: [
          {
            name: "Fetch Success",
            score: 15,
            maxScore: 15,
            value: "HTTP 200 in 100ms",
            status: "good",
          },
          {
            name: "Word Count",
            score: 35,
            maxScore: 45,
            value: "500 words",
            status: "needs_improvement",
          },
        ],
      },
      authorityContext: {
        name: "Authority Context",
        key: "authorityContext",
        score: 20,
        maxScore: 40,
        factors: [
          {
            name: "Author Attribution",
            score: 0,
            maxScore: 10,
            value: "Not found",
            status: "critical",
          },
          {
            name: "Publication Date",
            score: 10,
            maxScore: 10,
            value: "Found",
            status: "good",
          },
        ],
      },
    },
    recommendations: [
      {
        category: "Authority Context",
        factor: "Author Attribution",
        currentValue: "Not found",
        priority: "high",
        recommendation: "Add visible author information.",
      },
      {
        category: "Content Extractability",
        factor: "Word Count",
        currentValue: "500 words",
        priority: "low",
        recommendation: "Add more content.",
      },
    ],
    rawData: {
      title: "Test Page",
      metaDescription: "",
      wordCount: 500,
    },
    meta: {
      version: "0.1.0",
      analysisDurationMs: 150,
    },
  };
}

describe("renderReport", () => {
  describe("pretty format", () => {
    it("renders without errors", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "pretty" });

      expect(typeof output).toBe("string");
      expect(output.length).toBeGreaterThan(0);
    });

    it("includes URL", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "pretty" });

      expect(output).toContain("example.com");
    });

    it("includes score", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "pretty" });

      expect(output).toContain("72");
    });

    it("includes categories", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "pretty" });

      expect(output).toContain("Content Extractability");
      expect(output).toContain("Authority Context");
    });
  });

  describe("json format", () => {
    it("renders valid JSON", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "json" });

      expect(() => JSON.parse(output)).not.toThrow();
    });

    it("preserves all fields", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "json" });
      const parsed = JSON.parse(output);

      expect(parsed.url).toBe("https://example.com");
      expect(parsed.overallScore).toBe(72);
      expect(parsed.grade).toBe("B-");
      expect(parsed.categories).toBeDefined();
      expect(parsed.recommendations).toBeDefined();
      expect(parsed.meta).toBeDefined();
    });
  });

  describe("md format", () => {
    it("renders without errors", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "md" });

      expect(typeof output).toBe("string");
      expect(output.length).toBeGreaterThan(0);
    });

    it("includes markdown headers", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "md" });

      expect(output).toContain("# AI SEO Audit");
      expect(output).toContain("##");
    });

    it("includes tables", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "md" });

      expect(output).toContain("|");
      expect(output).toContain("---");
    });

    it("includes URL", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "md" });

      expect(output).toContain("https://example.com");
    });

    it("includes categories", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "md" });

      expect(output).toContain("Content Extractability");
    });

    it("includes recommendations", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "md" });

      expect(output).toContain("Recommendation");
      expect(output).toContain("Author Attribution");
    });
  });

  describe("html format", () => {
    it("renders valid HTML", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("<!DOCTYPE html>");
      expect(output).toContain("<html");
      expect(output).toContain("</html>");
    });

    it("is self-contained with inline CSS", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("<style>");
      expect(output).toContain("</style>");
    });

    it("includes URL", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("example.com");
    });

    it("includes score", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("72");
    });

    it("includes categories", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("Content Extractability");
      expect(output).toContain("Authority Context");
    });

    it("includes SVG gauges", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("<svg");
      expect(output).toContain("</svg>");
    });

    it("includes recommendations grouped by category", () => {
      const result = makeMinimalResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("Author Attribution");
      expect(output).toContain("Add visible author");
    });
  });

  describe("default format", () => {
    it("defaults to pretty", () => {
      const result = makeMinimalResult();
      const prettyOutput = renderReport(result, { format: "pretty" });
      const defaultOutput = renderReport(result, { format: "pretty" });

      expect(defaultOutput).toBe(prettyOutput);
    });
  });
});
