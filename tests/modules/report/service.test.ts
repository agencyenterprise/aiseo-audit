import { describe, expect, it } from "vitest";
import type { AnalyzerResultType } from "../../../src/modules/analyzer/schema.js";
import {
  renderReport,
  renderSitemapReport,
} from "../../../src/modules/report/service.js";
import type { SitemapResultType } from "../../../src/modules/sitemap/schema.js";

function makeMinimalResult(): AnalyzerResultType {
  return {
    url: "https://example.com",
    signalsBase: "https://example.com",
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

  describe("signalsBase display", () => {
    it("shows signals base in pretty format", () => {
      const output = renderReport(makeMinimalResult(), { format: "pretty" });
      expect(output).toContain("Domain signals checked at");
      expect(output).toContain("example.com");
    });

    it("includes signalsBase in json output", () => {
      const output = renderReport(makeMinimalResult(), { format: "json" });
      const parsed = JSON.parse(output);
      expect(parsed.signalsBase).toBe("https://example.com");
    });

    it("shows signals base in md format", () => {
      const output = renderReport(makeMinimalResult(), { format: "md" });
      expect(output).toContain("Domain signals checked at");
      expect(output).toContain("example.com");
    });

    it("shows signals base in html format", () => {
      const output = renderReport(makeMinimalResult(), { format: "html" });
      expect(output).toContain("Domain signals checked at");
      expect(output).toContain("example.com");
    });
  });
});

function makeMinimalSitemapResult(): SitemapResultType {
  const urlResult = makeMinimalResult();
  return {
    sitemapUrl: "https://example.com/sitemap.xml",
    signalsBase: "https://example.com/sitemap.xml",
    analyzedAt: "2026-02-11T12:00:00.000Z",
    totalUrls: 2,
    succeededCount: 1,
    failedCount: 1,
    averageScore: 72,
    averageGrade: "B-",
    categoryAverages: {
      contentExtractability: { name: "Content Extractability", averagePct: 80 },
      authorityContext: { name: "Authority Context", averagePct: 55 },
    },
    urlResults: [
      { status: "success", result: urlResult },
      {
        status: "failed",
        url: "https://example.com/broken",
        error: "Connection timeout",
      },
    ],
    meta: {
      version: "0.1.0",
      analysisDurationMs: 500,
    },
  };
}

describe("rendering actionable recommendation fields", () => {
  function makeResultWithRichRec(): AnalyzerResultType {
    const base = makeMinimalResult();
    return {
      ...base,
      recommendations: [
        {
          ...base.recommendations[0],
          steps: ["Step one", "Step two", "Step three"],
          codeExample: '<script type="application/ld+json">\n{}\n</script>',
          learnMoreUrl: "https://schema.org/docs/gs.html",
        },
      ],
    };
  }

  describe("pretty format", () => {
    it("renders steps as numbered list", () => {
      const output = renderReport(makeResultWithRichRec(), { format: "pretty" });
      expect(output).toContain("Steps:");
      expect(output).toContain("1. Step one");
      expect(output).toContain("2. Step two");
    });

    it("renders code example", () => {
      const output = renderReport(makeResultWithRichRec(), { format: "pretty" });
      expect(output).toContain("Example:");
      expect(output).toContain("application/ld+json");
    });

    it("renders learnMoreUrl", () => {
      const output = renderReport(makeResultWithRichRec(), { format: "pretty" });
      expect(output).toContain("Learn more:");
      expect(output).toContain("https://schema.org/docs/gs.html");
    });
  });

  describe("markdown format", () => {
    it("renders steps as numbered list", () => {
      const output = renderReport(makeResultWithRichRec(), { format: "md" });
      expect(output).toContain("1. Step one");
      expect(output).toContain("2. Step two");
    });

    it("renders code example as fenced code block", () => {
      const output = renderReport(makeResultWithRichRec(), { format: "md" });
      expect(output).toContain("```");
      expect(output).toContain("application/ld+json");
    });

    it("renders learnMoreUrl as link", () => {
      const output = renderReport(makeResultWithRichRec(), { format: "md" });
      expect(output).toContain("[Learn more](https://schema.org/docs/gs.html)");
    });
  });

  describe("html format", () => {
    it("renders steps as ordered list", () => {
      const output = renderReport(makeResultWithRichRec(), { format: "html" });
      expect(output).toContain("<ol");
      expect(output).toContain("<li>Step one</li>");
    });

    it("renders code example in pre block", () => {
      const output = renderReport(makeResultWithRichRec(), { format: "html" });
      expect(output).toContain("<pre");
      expect(output).toContain("application/ld+json");
    });

    it("renders learnMoreUrl as anchor", () => {
      const output = renderReport(makeResultWithRichRec(), { format: "html" });
      expect(output).toContain('href="https://schema.org/docs/gs.html"');
      expect(output).toContain("Learn more");
    });
  });

  describe("json format", () => {
    it("includes steps in JSON output", () => {
      const output = renderReport(makeResultWithRichRec(), { format: "json" });
      const parsed = JSON.parse(output);
      expect(parsed.recommendations[0].steps).toEqual([
        "Step one",
        "Step two",
        "Step three",
      ]);
    });

    it("includes codeExample in JSON output", () => {
      const output = renderReport(makeResultWithRichRec(), { format: "json" });
      const parsed = JSON.parse(output);
      expect(parsed.recommendations[0].codeExample).toContain(
        "application/ld+json",
      );
    });

    it("includes learnMoreUrl in JSON output", () => {
      const output = renderReport(makeResultWithRichRec(), { format: "json" });
      const parsed = JSON.parse(output);
      expect(parsed.recommendations[0].learnMoreUrl).toBe(
        "https://schema.org/docs/gs.html",
      );
    });
  });
});

describe("http URL notes", () => {
  function makeHttpResult(): AnalyzerResultType {
    return { ...makeMinimalResult(), url: "http://example.com" };
  }

  function makeHttpSitemapResult(): SitemapResultType {
    const base = makeMinimalSitemapResult();
    return {
      ...base,
      urlResults: [
        { status: "success", result: { ...makeMinimalResult(), url: "http://example.com/page" } },
      ],
    };
  }

  it("json format includes http note for http URL", () => {
    const output = renderReport(makeHttpResult(), { format: "json" });
    const parsed = JSON.parse(output);
    expect(parsed.notes).toBeDefined();
    expect(parsed.notes[0]).toContain("HTTP");
  });

  it("json format does not include notes for https URL", () => {
    const output = renderReport(makeMinimalResult(), { format: "json" });
    const parsed = JSON.parse(output);
    expect(parsed.notes).toBeUndefined();
  });

  it("sitemap json format includes http note when a URL is http", () => {
    const output = renderSitemapReport(makeHttpSitemapResult(), { format: "json" });
    const parsed = JSON.parse(output);
    expect(parsed.notes).toBeDefined();
  });

  it("markdown format includes http note for http URL", () => {
    const output = renderReport(makeHttpResult(), { format: "md" });
    expect(output).toContain("HTTP");
  });

  it("sitemap markdown format includes http note when a URL is http", () => {
    const output = renderSitemapReport(makeHttpSitemapResult(), { format: "md" });
    expect(output).toContain("HTTP");
  });

  it("pretty format includes http note for http URL", () => {
    const output = renderReport(makeHttpResult(), { format: "pretty" });
    expect(output).toContain("HTTP");
  });

  it("sitemap pretty format includes http note when a URL is http", () => {
    const output = renderSitemapReport(makeHttpSitemapResult(), { format: "pretty" });
    expect(output).toContain("HTTP");
  });
});

describe("renderSitemapReport", () => {
  describe("pretty format", () => {
    it("renders without errors", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "pretty",
      });
      expect(typeof output).toBe("string");
      expect(output.length).toBeGreaterThan(0);
    });

    it("includes sitemap URL", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "pretty",
      });
      expect(output).toContain("sitemap.xml");
    });

    it("includes average score", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "pretty",
      });
      expect(output).toContain("72");
    });

    it("includes signals base", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "pretty",
      });
      expect(output).toContain("Domain signals checked at");
    });

    it("shows failed URL with error", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "pretty",
      });
      expect(output).toContain("Connection timeout");
    });
  });

  describe("json format", () => {
    it("renders valid JSON", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "json",
      });
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it("preserves all summary fields", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "json",
      });
      const parsed = JSON.parse(output);
      expect(parsed.sitemapUrl).toBe("https://example.com/sitemap.xml");
      expect(parsed.averageScore).toBe(72);
      expect(parsed.totalUrls).toBe(2);
      expect(parsed.succeededCount).toBe(1);
      expect(parsed.failedCount).toBe(1);
      expect(parsed.signalsBase).toBeDefined();
      expect(parsed.urlResults).toHaveLength(2);
    });
  });

  describe("md format", () => {
    it("renders without errors", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "md",
      });
      expect(typeof output).toBe("string");
      expect(output.length).toBeGreaterThan(0);
    });

    it("includes markdown headers", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "md",
      });
      expect(output).toContain("# AI SEO Sitemap Audit Report");
    });

    it("includes summary table", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "md",
      });
      expect(output).toContain("| Average Score |");
      expect(output).toContain("72");
    });

    it("includes per-URL sections", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "md",
      });
      expect(output).toContain("https://example.com");
      expect(output).toContain("https://example.com/broken");
    });
  });

  describe("html format", () => {
    it("renders valid HTML", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "html",
      });
      expect(output).toContain("<!DOCTYPE html>");
      expect(output).toContain("</html>");
    });

    it("is self-contained with inline CSS", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "html",
      });
      expect(output).toContain("<style>");
    });

    it("includes average score", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "html",
      });
      expect(output).toContain("72");
    });

    it("includes signals base", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "html",
      });
      expect(output).toContain("Domain signals checked at");
    });

    it("includes category averages", () => {
      const output = renderSitemapReport(makeMinimalSitemapResult(), {
        format: "html",
      });
      expect(output).toContain("Content Extractability");
      expect(output).toContain("80%");
    });
  });
});
