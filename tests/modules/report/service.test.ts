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

    it("renders neutral and critical factor status in markdown", () => {
      const result: AnalyzerResultType = {
        ...makeMinimalResult(),
        categories: {
          contentExtractability: {
            name: "Content Extractability",
            key: "contentExtractability",
            score: 40,
            maxScore: 60,
            factors: [
              {
                name: "Factor A",
                score: 0,
                maxScore: 10,
                value: "n/a",
                status: "neutral",
              },
              {
                name: "Factor B",
                score: 0,
                maxScore: 10,
                value: "missing",
                status: "critical",
              },
            ],
          },
        },
      };
      const output = renderReport(result, { format: "md" });
      expect(output).toContain("| - |");
      expect(output).toContain("| fail |");
    });

    it("renders medium priority recommendation in markdown", () => {
      const result: AnalyzerResultType = {
        ...makeMinimalResult(),
        recommendations: [
          {
            category: "Content Extractability",
            factor: "Word Count",
            currentValue: "200 words",
            priority: "medium",
            recommendation: "Consider adding more content.",
          },
        ],
      };
      const output = renderReport(result, { format: "md" });
      expect(output).toContain("*MED*");
    });

    it("skips recommendations section when no recommendations", () => {
      const result: AnalyzerResultType = {
        ...makeMinimalResult(),
        recommendations: [],
      };
      const output = renderReport(result, { format: "md" });
      expect(output).toContain("# AI SEO Audit");
      expect(output).not.toContain("## Recommendations");
    });

    it("renders zero maxScore category in markdown", () => {
      const result: AnalyzerResultType = {
        ...makeMinimalResult(),
        categories: {
          contentExtractability: {
            name: "Content Extractability",
            key: "contentExtractability",
            score: 0,
            maxScore: 0,
            factors: [],
          },
        },
      };
      const output = renderReport(result, { format: "md" });
      expect(output).toContain("Content Extractability");
      expect(output).toContain("0%");
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
      const output = renderReport(makeResultWithRichRec(), {
        format: "pretty",
      });
      expect(output).toContain("Steps:");
      expect(output).toContain("1. Step one");
      expect(output).toContain("2. Step two");
    });

    it("renders code example", () => {
      const output = renderReport(makeResultWithRichRec(), {
        format: "pretty",
      });
      expect(output).toContain("Example:");
      expect(output).toContain("application/ld+json");
    });

    it("renders learnMoreUrl", () => {
      const output = renderReport(makeResultWithRichRec(), {
        format: "pretty",
      });
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
        {
          status: "success",
          result: { ...makeMinimalResult(), url: "http://example.com/page" },
        },
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
    const output = renderSitemapReport(makeHttpSitemapResult(), {
      format: "json",
    });
    const parsed = JSON.parse(output);
    expect(parsed.notes).toBeDefined();
  });

  it("markdown format includes http note for http URL", () => {
    const output = renderReport(makeHttpResult(), { format: "md" });
    expect(output).toContain("HTTP");
  });

  it("sitemap markdown format includes http note when a URL is http", () => {
    const output = renderSitemapReport(makeHttpSitemapResult(), {
      format: "md",
    });
    expect(output).toContain("HTTP");
  });

  it("pretty format includes http note for http URL", () => {
    const output = renderReport(makeHttpResult(), { format: "pretty" });
    expect(output).toContain("HTTP");
  });

  it("sitemap pretty format includes http note when a URL is http", () => {
    const output = renderSitemapReport(makeHttpSitemapResult(), {
      format: "pretty",
    });
    expect(output).toContain("HTTP");
  });

  it("html format includes http note for http URL", () => {
    const output = renderReport(makeHttpResult(), { format: "html" });
    expect(output).toContain("HTTP");
  });

  it("sitemap html format includes http note when a URL is http", () => {
    const output = renderSitemapReport(makeHttpSitemapResult(), {
      format: "html",
    });
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

  describe("html neutral status in sitemap URL sections", () => {
    it("renders neutral status for a factor with status neutral in html", () => {
      const resultWithNeutral: AnalyzerResultType = {
        ...makeMinimalResult(),
        categories: {
          contentExtractability: {
            name: "Content Extractability",
            key: "contentExtractability",
            score: 50,
            maxScore: 60,
            factors: [
              {
                name: "Some Factor",
                score: 0,
                maxScore: 15,
                value: "Not applicable",
                status: "neutral",
              },
            ],
          },
        },
      };
      const sitemap = makeMinimalSitemapResult();
      const output = renderSitemapReport(
        {
          ...sitemap,
          urlResults: [{ status: "success", result: resultWithNeutral }],
        },
        { format: "html" },
      );
      expect(output).toContain("sitemap-url-section");
    });

    it("renders html report with neutral factor status", () => {
      const result: AnalyzerResultType = {
        ...makeMinimalResult(),
        categories: {
          contentExtractability: {
            name: "Content Extractability",
            key: "contentExtractability",
            score: 50,
            maxScore: 60,
            factors: [
              {
                name: "Image Accessibility",
                score: 0,
                maxScore: 10,
                value: "No images",
                status: "neutral",
              },
            ],
          },
        },
      };
      const output = renderReport(result, { format: "html" });
      expect(output).toContain("&#8212;");
      expect(output).toContain("neutral");
    });

    it("renders sitemap URL result with category maxScore zero", () => {
      const resultWithZeroMax: AnalyzerResultType = {
        ...makeMinimalResult(),
        categories: {
          contentExtractability: {
            name: "Content Extractability",
            key: "contentExtractability",
            score: 0,
            maxScore: 0,
            factors: [],
          },
        },
      };
      const sitemap = makeMinimalSitemapResult();
      const output = renderSitemapReport(
        {
          ...sitemap,
          urlResults: [{ status: "success", result: resultWithZeroMax }],
        },
        { format: "html" },
      );
      expect(output).toContain("Content Extractability");
      expect(output).toContain("0%");
    });
  });

  describe("html score color branches", () => {
    it("uses red color for category average below 50 in html format", () => {
      const sitemap = makeMinimalSitemapResult();
      const output = renderSitemapReport(
        {
          ...sitemap,
          categoryAverages: {
            contentExtractability: {
              name: "Content Extractability",
              averagePct: 30,
            },
          },
        },
        { format: "html" },
      );
      expect(output).toContain("#ff3333");
    });

    it("uses secondary text color when failedCount is zero", () => {
      const sitemap = makeMinimalSitemapResult();
      const output = renderSitemapReport(
        { ...sitemap, failedCount: 0 },
        { format: "html" },
      );
      expect(output).toContain("var(--text-secondary)");
    });

    it("omits top recommendation div when URL result has no recommendations", () => {
      const sitemap = makeMinimalSitemapResult();
      const noRec: AnalyzerResultType = {
        ...makeMinimalResult(),
        recommendations: [],
      };
      const output = renderSitemapReport(
        {
          ...sitemap,
          urlResults: [{ status: "success", result: noRec }],
        },
        { format: "html" },
      );
      expect(output).toContain("sitemap-url-section");
      expect(output).toContain("example.com");
    });
  });
});

describe("html recommendation detail branches", () => {
  it("renders recommendation with only codeExample (no steps, no learnMoreUrl)", () => {
    const result: AnalyzerResultType = {
      ...makeMinimalResult(),
      recommendations: [
        {
          category: "Content Extractability",
          factor: "Word Count",
          currentValue: "100 words",
          priority: "high",
          recommendation: "Add more content.",
          codeExample: "<p>Example</p>",
        },
      ],
    };
    const output = renderReport(result, { format: "html" });
    expect(output).toContain("<pre");
    expect(output).not.toContain("<ol");
  });

  it("renders medium priority recommendation with MED label", () => {
    const result: AnalyzerResultType = {
      ...makeMinimalResult(),
      recommendations: [
        {
          category: "Content Extractability",
          factor: "Word Count",
          currentValue: "200 words",
          priority: "medium",
          recommendation: "Consider adding more content.",
        },
      ],
    };
    const output = renderReport(result, { format: "html" });
    expect(output).toContain("MED");
    expect(output).toContain("priority-med");
  });

  it("renders steps and learnMoreUrl without codeExample", () => {
    const result: AnalyzerResultType = {
      ...makeMinimalResult(),
      recommendations: [
        {
          category: "Content Extractability",
          factor: "Word Count",
          currentValue: "100 words",
          priority: "low",
          recommendation: "Add content.",
          steps: ["Step one", "Step two"],
          learnMoreUrl: "https://example.com/docs",
        },
      ],
    };
    const output = renderReport(result, { format: "html" });
    expect(output).toContain("<ol");
    expect(output).toContain("Learn more");
    expect(output).not.toContain("<pre");
  });

  it("renders without recommendations section when recommendations list is empty", () => {
    const result: AnalyzerResultType = {
      ...makeMinimalResult(),
      recommendations: [],
      categories: {
        contentExtractability: {
          name: "Content Extractability",
          key: "contentExtractability",
          score: 30,
          maxScore: 60,
          factors: [],
        },
      },
    };
    const output = renderReport(result, { format: "html" });
    expect(output).toContain("<!DOCTYPE html>");
    expect(output).toContain("Content Extractability");
  });
});

describe("html score color branches for single URL report", () => {
  it("uses red colors for overall score below 50", () => {
    const result: AnalyzerResultType = {
      ...makeMinimalResult(),
      overallScore: 30,
      grade: "F",
      categories: {
        contentExtractability: {
          name: "Content Extractability",
          key: "contentExtractability",
          score: 10,
          maxScore: 60,
          factors: [],
        },
      },
    };
    const output = renderReport(result, { format: "html" });
    expect(output).toContain("#ff3333");
    expect(output).toContain("#cc0000");
  });

  it("skips gauge arc segments with zero score (catDeg < 0.1 branch)", () => {
    const result: AnalyzerResultType = {
      ...makeMinimalResult(),
      overallScore: 50,
      grade: "C-",
      totalPoints: 60,
      maxPoints: 120,
      categories: {
        contentExtractability: {
          name: "Content Extractability",
          key: "contentExtractability",
          score: 60,
          maxScore: 60,
          factors: [],
        },
        authorityContext: {
          name: "Authority Context",
          key: "authorityContext",
          score: 0,
          maxScore: 60,
          factors: [],
        },
      },
    };
    const output = renderReport(result, { format: "html" });
    expect(output).toContain("<svg");
  });

  it("renders gauge with maxPoints zero (falls back to catDeg=0 branch)", () => {
    const result: AnalyzerResultType = {
      ...makeMinimalResult(),
      overallScore: 0,
      grade: "F",
      totalPoints: 0,
      maxPoints: 0,
      categories: {
        contentExtractability: {
          name: "Content Extractability",
          key: "contentExtractability",
          score: 0,
          maxScore: 0,
          factors: [],
        },
      },
    };
    const output = renderReport(result, { format: "html" });
    expect(output).toContain("<svg");
  });

  it("handles category with maxScore zero but positive score", () => {
    const result: AnalyzerResultType = {
      ...makeMinimalResult(),
      overallScore: 50,
      grade: "C-",
      totalPoints: 10,
      maxPoints: 60,
      categories: {
        contentExtractability: {
          name: "Content Extractability",
          key: "contentExtractability",
          score: 10,
          maxScore: 60,
          factors: [],
        },
        authorityContext: {
          name: "Authority Context",
          key: "authorityContext",
          score: 5,
          maxScore: 0,
          factors: [],
        },
      },
    };
    const output = renderReport(result, { format: "html" });
    expect(output).toContain("<svg");
    expect(output).toContain("Authority Context");
  });
});

describe("markdown sitemap coverage branches", () => {
  it("skips category averages section when categoryAverages is empty", () => {
    const sitemap = makeMinimalSitemapResult();
    const output = renderSitemapReport(
      { ...sitemap, categoryAverages: {} },
      { format: "md" },
    );
    expect(output).toContain("# AI SEO Sitemap Audit Report");
    expect(output).not.toContain("Site-Wide Category Averages");
  });

  it("renders URL result with zero maxScore category in markdown", () => {
    const zeroMaxResult: AnalyzerResultType = {
      ...makeMinimalResult(),
      categories: {
        contentExtractability: {
          name: "Content Extractability",
          key: "contentExtractability",
          score: 0,
          maxScore: 0,
          factors: [],
        },
      },
    };
    const sitemap = makeMinimalSitemapResult();
    const output = renderSitemapReport(
      {
        ...sitemap,
        urlResults: [{ status: "success", result: zeroMaxResult }],
      },
      { format: "md" },
    );
    expect(output).toContain("0%");
  });

  it("skips recommendations section when URL result has no recommendations", () => {
    const noRecResult: AnalyzerResultType = {
      ...makeMinimalResult(),
      recommendations: [],
    };
    const sitemap = makeMinimalSitemapResult();
    const output = renderSitemapReport(
      { ...sitemap, urlResults: [{ status: "success", result: noRecResult }] },
      { format: "md" },
    );
    expect(output).toContain("example.com");
    expect(output).not.toContain("Recommendations:");
  });

  it("renders medium priority recommendation as MED in markdown", () => {
    const medRecResult: AnalyzerResultType = {
      ...makeMinimalResult(),
      recommendations: [
        {
          category: "Content Extractability",
          factor: "Word Count",
          currentValue: "200 words",
          priority: "medium",
          recommendation: "Add more content.",
        },
      ],
    };
    const sitemap = makeMinimalSitemapResult();
    const output = renderSitemapReport(
      { ...sitemap, urlResults: [{ status: "success", result: medRecResult }] },
      { format: "md" },
    );
    expect(output).toContain("*MED*");
  });
});

describe("pretty format grade color branches", () => {
  it("uses red color for grade C (not A or B)", () => {
    const result: AnalyzerResultType = {
      ...makeMinimalResult(),
      overallScore: 73,
      grade: "C",
    };
    const output = renderReport(result, { format: "pretty" });
    expect(output).toContain("73");
  });

  it("sitemap pretty: skips category averages section when empty", () => {
    const output = renderSitemapReport(
      { ...makeMinimalSitemapResult(), categoryAverages: {} },
      { format: "pretty" },
    );
    expect(output).toContain("72");
    expect(output).not.toContain("Site-Wide Category Averages");
  });

  it("sitemap pretty: uses red for category average below 40", () => {
    const output = renderSitemapReport(
      {
        ...makeMinimalSitemapResult(),
        categoryAverages: {
          contentExtractability: {
            name: "Content Extractability",
            averagePct: 25,
          },
        },
      },
      { format: "pretty" },
    );
    expect(output).toContain("25%");
  });

  it("sitemap pretty: skips top-rec line when URL has no recommendations", () => {
    const noRecResult: AnalyzerResultType = {
      ...makeMinimalResult(),
      grade: "C",
      recommendations: [],
    };
    const output = renderSitemapReport(
      {
        ...makeMinimalSitemapResult(),
        urlResults: [{ status: "success", result: noRecResult }],
      },
      { format: "pretty" },
    );
    expect(output).toContain("example.com");
  });

  it("pretty: shows found status for robots.txt and llms.txt when present", () => {
    const result: AnalyzerResultType = {
      ...makeMinimalResult(),
      grade: "A",
      rawData: {
        ...makeMinimalResult().rawData,
        crawlerAccess: { allowed: [], blocked: [], unknown: [] },
        llmsTxt: { llmsTxtExists: true, llmsFullTxtExists: true },
      },
    };
    const output = renderReport(result, { format: "pretty" });
    expect(output).toContain("found");
  });

  it("pretty: renders zero maxScore category without NaN", () => {
    const result: AnalyzerResultType = {
      ...makeMinimalResult(),
      recommendations: [],
      categories: {
        contentExtractability: {
          name: "Content Extractability",
          key: "contentExtractability",
          score: 0,
          maxScore: 0,
          factors: [],
        },
      },
    };
    const output = renderReport(result, { format: "pretty" });
    expect(output).toContain("Content Extractability");
  });

  it("pretty: renders medium priority recommendation", () => {
    const result: AnalyzerResultType = {
      ...makeMinimalResult(),
      recommendations: [
        {
          category: "Content Extractability",
          factor: "Word Count",
          currentValue: "200 words",
          priority: "medium",
          recommendation: "Add more content.",
        },
      ],
    };
    const output = renderReport(result, { format: "pretty" });
    expect(output).toContain("[MED]");
  });
});
