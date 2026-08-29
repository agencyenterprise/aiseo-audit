import { describe, expect, it } from "vitest";
import type { AnalyzerResultType } from "../../../src/modules/analyzer/schema.js";
import {
  renderReport,
  renderSitemapReport,
} from "../../../src/modules/report/service.js";
import type { SitemapResultType } from "../../../src/modules/sitemap/schema.js";
import {
  makeCategory,
  makeFactor,
  makeGate,
  makeRecommendation,
  makeResult,
  makeStages,
} from "../../helpers/results.js";

describe("renderReport", () => {
  describe("pretty format", () => {
    it("renders without errors", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "pretty" });

      expect(typeof output).toBe("string");
      expect(output.length).toBeGreaterThan(0);
    });

    it("includes URL", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "pretty" });

      expect(output).toContain("example.com");
    });

    it("includes score", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "pretty" });

      expect(output).toContain("72");
    });

    it("includes categories", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "pretty" });

      expect(output).toContain("Content Extractability");
      expect(output).toContain("Authority Context");
    });
  });

  describe("json format", () => {
    it("renders valid JSON", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "json" });

      expect(() => JSON.parse(output)).not.toThrow();
    });

    it("preserves all fields", () => {
      const result = makeResult();
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
      const result = makeResult();
      const output = renderReport(result, { format: "md" });

      expect(typeof output).toBe("string");
      expect(output.length).toBeGreaterThan(0);
    });

    it("includes markdown headers", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "md" });

      expect(output).toContain("# AI SEO Audit");
      expect(output).toContain("##");
    });

    it("includes tables", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "md" });

      expect(output).toContain("|");
      expect(output).toContain("---");
    });

    it("includes URL", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "md" });

      expect(output).toContain("https://example.com");
    });

    it("includes categories", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "md" });

      expect(output).toContain("Content Extractability");
    });

    it("includes recommendations", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "md" });

      expect(output).toContain("Recommendation");
      expect(output).toContain("Author Attribution");
    });

    it("renders neutral and critical factor status in markdown", () => {
      const result: AnalyzerResultType = {
        ...makeResult(),
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
        ...makeResult(),
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
        ...makeResult(),
        recommendations: [],
      };
      const output = renderReport(result, { format: "md" });
      expect(output).toContain("# AI SEO Audit");
      expect(output).not.toContain("## Recommendations");
    });

    it("renders zero maxScore category in markdown", () => {
      const result: AnalyzerResultType = {
        ...makeResult(),
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
      const result = makeResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("<!DOCTYPE html>");
      expect(output).toContain("<html");
      expect(output).toContain("</html>");
    });

    it("is self-contained with inline CSS", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("<style>");
      expect(output).toContain("</style>");
    });

    it("includes URL", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("example.com");
    });

    it("includes score", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("72");
    });

    it("includes categories", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("Content Extractability");
      expect(output).toContain("Authority Context");
    });

    it("includes SVG gauges", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("<svg");
      expect(output).toContain("</svg>");
    });

    it("includes recommendations grouped by category", () => {
      const result = makeResult();
      const output = renderReport(result, { format: "html" });

      expect(output).toContain("Author Attribution");
      expect(output).toContain("Add visible author");
    });
  });

  describe("default format", () => {
    it("defaults to pretty when format is omitted at runtime", () => {
      const result = makeResult();
      const prettyOutput = renderReport(result, { format: "pretty" });
      const defaultOutput = renderReport(
        result,
        {} as Parameters<typeof renderReport>[1],
      );

      expect(defaultOutput).toBe(prettyOutput);
    });
  });

  describe("signalsBase display", () => {
    it("shows signals base in pretty format", () => {
      const output = renderReport(makeResult(), { format: "pretty" });
      expect(output).toContain("Domain signals checked at");
      expect(output).toContain("example.com");
    });

    it("includes signalsBase in json output", () => {
      const output = renderReport(makeResult(), { format: "json" });
      const parsed = JSON.parse(output);
      expect(parsed.signalsBase).toBe("https://example.com");
    });

    it("shows signals base in md format", () => {
      const output = renderReport(makeResult(), { format: "md" });
      expect(output).toContain("Domain signals checked at");
      expect(output).toContain("example.com");
    });

    it("shows signals base in html format", () => {
      const output = renderReport(makeResult(), { format: "html" });
      expect(output).toContain("Domain signals checked at");
      expect(output).toContain("example.com");
    });
  });
});

function makeMinimalSitemapResult(): SitemapResultType {
  const urlResult = makeResult();
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
    const base = makeResult();
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
    return { ...makeResult(), url: "http://example.com" };
  }

  function makeHttpSitemapResult(): SitemapResultType {
    const base = makeMinimalSitemapResult();
    return {
      ...base,
      urlResults: [
        {
          status: "success",
          result: { ...makeResult(), url: "http://example.com/page" },
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
    const output = renderReport(makeResult(), { format: "json" });
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
        ...makeResult(),
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
        ...makeResult(),
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
        ...makeResult(),
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
        ...makeResult(),
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
      ...makeResult(),
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
    expect(output).not.toContain('<ol class="rec-steps">');
  });

  it("renders medium priority recommendation with MED label", () => {
    const result: AnalyzerResultType = {
      ...makeResult(),
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
      ...makeResult(),
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
      ...makeResult(),
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
      ...makeResult(),
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
      ...makeResult(),
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
      ...makeResult(),
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
      ...makeResult(),
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
      ...makeResult(),
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
      ...makeResult(),
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
      ...makeResult(),
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
      ...makeResult(),
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
      ...makeResult(),
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
      ...makeResult(),
      grade: "A",
      rawData: {
        ...makeResult().rawData,
        crawlerAccess: { allowed: [], blocked: [], unknown: [] },
        llmsTxt: { llmsTxtExists: true, llmsFullTxtExists: true },
      },
    };
    const output = renderReport(result, { format: "pretty" });
    expect(output).toContain("found");
  });

  it("pretty: renders zero maxScore category without NaN", () => {
    const result: AnalyzerResultType = {
      ...makeResult(),
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
      ...makeResult(),
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

describe("TL;DR block", () => {
  function makeResultWithFixes(): AnalyzerResultType {
    const base = makeResult();
    return {
      ...base,
      categories: {
        ...base.categories,
        answerability: {
          name: "Answerability",
          key: "answerability",
          score: 27,
          maxScore: 40,
          factors: [
            {
              name: "Answer Capsules",
              score: 0,
              maxScore: 13,
              value: "0 capsules",
              status: "critical",
            },
            {
              name: "Direct Answer Statements",
              score: 27,
              maxScore: 27,
              value: "Plenty",
              status: "good",
            },
          ],
        },
      },
      recommendations: [
        {
          category: "Answerability",
          factor: "Answer Capsules",
          currentValue: "0",
          priority: "high",
          recommendation: "Add answer capsules",
          auditPoints: 13,
        },
        {
          category: "Authority Context",
          factor: "Author Attribution",
          currentValue: "Not found",
          priority: "high",
          recommendation: "Add author",
          auditPoints: 10,
        },
        {
          category: "Content Extractability",
          factor: "Image Alt Text",
          currentValue: "1/8",
          priority: "high",
          recommendation: "Add alt text",
          auditPoints: 7,
        },
      ],
    };
  }

  describe("pretty format", () => {
    it("includes the top 3 fixes with audit points", () => {
      const output = renderReport(makeResultWithFixes(), { format: "pretty" });
      expect(output).toContain("Top fixes");
      expect(output).toContain("Answer Capsules");
      expect(output).toContain("Author Attribution");
      expect(output).toContain("Image Alt Text");
      expect(output).toContain("13 audit pts");
    });

    it("includes the non-additive audit points note", () => {
      const output = renderReport(makeResultWithFixes(), { format: "pretty" });
      expect(output).toContain(
        "Audit points are internal audit weights, not additive citation-probability gains.",
      );
    });

    it("omits the TL;DR block when there are no recommendations", () => {
      const result = { ...makeResult(), recommendations: [] };
      const output = renderReport(result, { format: "pretty" });
      expect(output).not.toContain("Top fixes");
    });
  });

  describe("markdown format", () => {
    it("includes a Quick Summary section with ranked fixes", () => {
      const output = renderReport(makeResultWithFixes(), { format: "md" });
      expect(output).toContain("## Quick Summary");
      expect(output).toContain("Answer Capsules");
      expect(output).toContain("13 audit pts");
    });

    it("omits the Quick Summary section when there are no recommendations", () => {
      const result = { ...makeResult(), recommendations: [] };
      const output = renderReport(result, { format: "md" });
      expect(output).not.toContain("## Quick Summary");
    });
  });

  describe("html format", () => {
    it("includes a quick-summary card with the top fixes", () => {
      const output = renderReport(makeResultWithFixes(), { format: "html" });
      expect(output).toContain("Top fixes");
      expect(output).toContain("Answer Capsules");
      expect(output).toContain("13 audit pts");
    });

    it("omits the quick-summary card when there are no recommendations", () => {
      const result = { ...makeResult(), recommendations: [] };
      const output = renderReport(result, { format: "html" });
      expect(output).not.toContain("Top fixes");
    });
  });

  describe("json format", () => {
    it("exposes a tldr field with score, topFixes, and the note", () => {
      const output = renderReport(makeResultWithFixes(), { format: "json" });
      const parsed = JSON.parse(output);
      expect(parsed.tldr).toBeDefined();
      expect(parsed.tldr.score).toBe(72);
      expect(parsed.tldr.topFixes).toHaveLength(3);
      expect(parsed.tldr.topFixes[0].factor).toBe("Answer Capsules");
      expect(parsed.tldr.topFixes[0].auditPoints).toBe(13);
      expect(parsed.tldr.note).toContain("not additive");
      expect(output).not.toContain("projectedScore");
      expect(output).not.toContain("expectedGain");
    });

    it("omits topFixes when there are no recommendations but still exposes tldr", () => {
      const result = { ...makeResult(), recommendations: [] };
      const output = renderReport(result, { format: "json" });
      const parsed = JSON.parse(output);
      expect(parsed.tldr.topFixes).toHaveLength(0);
    });
  });
});

describe("tldrOnly mode", () => {
  function makeResultWithFixes(): AnalyzerResultType {
    const base = makeResult();
    return {
      ...base,
      categories: {
        ...base.categories,
        answerability: {
          name: "Answerability",
          key: "answerability",
          score: 27,
          maxScore: 40,
          factors: [
            {
              name: "Answer Capsules",
              score: 0,
              maxScore: 13,
              value: "0 capsules",
              status: "critical",
            },
          ],
        },
      },
      recommendations: [
        {
          category: "Answerability",
          factor: "Answer Capsules",
          currentValue: "0",
          priority: "high",
          recommendation: "Add answer capsules",
          auditPoints: 13,
        },
      ],
    };
  }

  describe("pretty format", () => {
    it("includes the TL;DR block", () => {
      const output = renderReport(makeResultWithFixes(), {
        format: "pretty",
        tldrOnly: true,
      });
      expect(output).toContain("Top fixes");
      expect(output).toContain("Answer Capsules");
    });

    it("excludes the detailed category breakdown", () => {
      const output = renderReport(makeResultWithFixes(), {
        format: "pretty",
        tldrOnly: true,
      });
      expect(output).not.toContain("Authority Context");
      expect(output).not.toContain("Fetch Success");
    });

    it("excludes the recommendations detail section", () => {
      const output = renderReport(makeResultWithFixes(), {
        format: "pretty",
        tldrOnly: true,
      });
      expect(output).not.toMatch(/\n\s*Recommendations:/);
    });
  });

  describe("markdown format", () => {
    it("emits only the Quick Summary section", () => {
      const output = renderReport(makeResultWithFixes(), {
        format: "md",
        tldrOnly: true,
      });
      expect(output).toContain("## Quick Summary");
      expect(output).not.toContain("### "); // no category sub-sections
      expect(output).not.toContain("| Factor |");
    });
  });

  describe("html format", () => {
    it("renders only the TL;DR card, no gauges or sections", () => {
      const output = renderReport(makeResultWithFixes(), {
        format: "html",
        tldrOnly: true,
      });
      expect(output).toContain("Top fixes");
      expect(output).not.toContain("gauges-row");
      expect(output).not.toContain("category-section");
    });

    it("is still a valid standalone HTML document", () => {
      const output = renderReport(makeResultWithFixes(), {
        format: "html",
        tldrOnly: true,
      });
      expect(output).toMatch(/^<!DOCTYPE html>/);
      expect(output).toContain("</html>");
    });
  });

  describe("json format", () => {
    it("emits only the tldr field plus top-level url", () => {
      const output = renderReport(makeResultWithFixes(), {
        format: "json",
        tldrOnly: true,
      });
      const parsed = JSON.parse(output);
      expect(parsed.tldr).toBeDefined();
      expect(parsed.url).toBe("https://example.com");
      expect(parsed.categories).toBeUndefined();
      expect(parsed.recommendations).toBeUndefined();
    });
  });
});

describe("pipeline stages section", () => {
  const formats = ["pretty", "md", "html"] as const;

  it.each(formats)("renders per-stage percentages in %s format", (format) => {
    const output = renderReport(makeResult({ stages: makeStages() }), {
      format,
    });
    expect(output).toContain("Pipeline Stages");
    expect(output).toContain("Technical Eligibility");
    expect(output).toContain("Retrieval Alignment");
    expect(output).toContain("Citation Fitness");
    expect(output).toContain("Provenance");
    expect(output).toContain("75%");
  });

  it.each(formats)(
    "omits the stages section when stages are absent in %s format",
    (format) => {
      const output = renderReport(makeResult({ stages: undefined }), {
        format,
      });
      expect(output).not.toContain("Pipeline Stages");
    },
  );

  it.each(formats)(
    "shows a PASS banner when eligibility passes in %s format",
    (format) => {
      const output = renderReport(makeResult({ stages: makeStages() }), {
        format,
      });
      expect(output).toContain("PASS");
    },
  );

  function makeFailedEligibilityStages() {
    const stages = makeStages();
    return {
      ...stages,
      technicalEligibility: {
        ...stages.technicalEligibility,
        status: "fail" as const,
        blockers: ["Fetch Success", "Text Extraction Quality"],
      },
      retrievalAlignment: {
        score: 0,
        maxScore: 80,
        pct: null,
        suppressed: true,
      },
      citationFitness: {
        ...stages.citationFitness,
        pct: null,
        uncappedPct: null,
        suppressed: true,
      },
      provenance: { score: 0, maxScore: 30, pct: null, suppressed: true },
    };
  }

  it.each(formats)(
    "shows a FAIL banner with blockers in %s format",
    (format) => {
      const output = renderReport(
        makeResult({ stages: makeFailedEligibilityStages() }),
        { format },
      );
      expect(output).toContain("FAIL");
      expect(output).toContain("Fetch Success");
      expect(output).toContain("Text Extraction Quality");
    },
  );

  it.each(formats)(
    "marks downstream stages as suppressed in %s format",
    (format) => {
      const output = renderReport(
        makeResult({ stages: makeFailedEligibilityStages() }),
        { format },
      );
      expect(output).toContain("suppressed (eligibility failed)");
    },
  );

  function makeCappedStages() {
    const stages = makeStages();
    return {
      ...stages,
      citationFitness: {
        ...stages.citationFitness,
        pct: 50,
        uncappedPct: 82,
        gates: [makeGate({ status: "tripped" })],
      },
    };
  }

  it.each(formats)(
    "lists tripped gates with label and cap in %s format",
    (format) => {
      const output = renderReport(makeResult({ stages: makeCappedStages() }), {
        format,
      });
      expect(output).toContain("capped at 50: Visible date is stale");
      expect(output).toContain("uncapped 82%");
    },
  );

  it.each(formats)("hides passing gates in %s format", (format) => {
    const output = renderReport(makeResult({ stages: makeStages() }), {
      format,
    });
    expect(output).not.toContain("capped at 50");
  });
});

describe("info status factors", () => {
  function makeResultWithDiagnostic(): AnalyzerResultType {
    return makeResult({
      categories: {
        contentExtractability: makeCategory({
          factors: [
            makeFactor({
              name: "Lists Presence",
              score: 0,
              maxScore: 0,
              value: "3 lists found",
              status: "info",
              evidence: "diagnostic",
            }),
            makeFactor({ name: "Fetch Success" }),
          ],
        }),
      },
    });
  }

  it.each(["pretty", "md", "html"] as const)(
    "labels info factors as unscored diagnostics in %s format",
    (format) => {
      const output = renderReport(makeResultWithDiagnostic(), { format });
      expect(output).toContain("unscored diagnostic");
    },
  );

  it.each(["pretty", "md", "html"] as const)(
    "groups info factors after scored factors in %s format",
    (format) => {
      const output = renderReport(makeResultWithDiagnostic(), { format });
      expect(output.indexOf("Fetch Success")).toBeLessThan(
        output.indexOf("Lists Presence"),
      );
    },
  );

  it("never styles info factors as failures in html", () => {
    const output = renderReport(makeResultWithDiagnostic(), {
      format: "html",
    });
    expect(output).toContain('class="audit-icon info"');
    expect(output).not.toContain('class="audit-icon fail">i<');
  });

  it("renders an unknown factor status without fail styling in html", () => {
    const result = makeResultWithDiagnostic();
    result.categories.contentExtractability.factors[0].status =
      "surprise" as never;
    const output = renderReport(result, { format: "html" });
    expect(output).toContain('class="audit-icon neutral"');
  });
});

describe("evidence tier badges", () => {
  function makeResultWithTieredFactor(): AnalyzerResultType {
    return makeResult({
      categories: {
        contentExtractability: makeCategory({
          factors: [
            makeFactor({
              name: "Boilerplate Ratio",
              evidence: "conditional",
            }),
          ],
        }),
      },
    });
  }

  it.each(["pretty", "md", "html"] as const)(
    "shows the factor evidence tier in %s format",
    (format) => {
      const output = renderReport(makeResultWithTieredFactor(), { format });
      expect(output).toContain("conditional");
    },
  );

  it("renders the tier as a badge element in html", () => {
    const output = renderReport(makeResultWithTieredFactor(), {
      format: "html",
    });
    expect(output).toContain('<span class="evidence-badge">conditional</span>');
  });
});

describe("report banners", () => {
  it.each(["pretty", "md", "html"] as const)(
    "renders the experimental engine preset banner in %s format",
    (format) => {
      const result = makeResult();
      result.meta.engine = "gpt";
      const output = renderReport(result, { format });
      expect(output).toContain("Experimental engine preset: gpt");
    },
  );

  it.each(["pretty", "md", "html"] as const)(
    "omits the engine banner for the generic engine in %s format",
    (format) => {
      const result = makeResult();
      result.meta.engine = "generic";
      const output = renderReport(result, { format });
      expect(output).not.toContain("Experimental engine preset");
    },
  );

  it.each(["pretty", "md", "html"] as const)(
    "warns about product pages when meta.domain is product in %s format",
    (format) => {
      const result = makeResult();
      result.meta.domain = "product";
      const output = renderReport(result, { format });
      expect(output).toContain(
        "prioritize price, specs, and comparisons over rewriting",
      );
    },
  );

  it("warns about product pages when rawData detects a product domain", () => {
    const result = makeResult();
    result.rawData.domainDetected = "product";
    const output = renderReport(result, { format: "pretty" });
    expect(output).toContain(
      "prioritize price, specs, and comparisons over rewriting",
    );
  });

  it("omits the product warning for informational pages", () => {
    const result = makeResult();
    result.meta.domain = "informational";
    const output = renderReport(result, { format: "pretty" });
    expect(output).not.toContain("hurt product pages");
  });
});

describe("recommendation truncation", () => {
  function makeResultWithFiveRecs(): AnalyzerResultType {
    return makeResult({
      recommendations: [1, 2, 3, 4, 5].map((n) =>
        makeRecommendation({
          category: "Authority Context",
          factor: `Factor ${n}`,
          recommendation: `Fix number ${n}`,
          auditPoints: n,
        }),
      ),
    });
  }

  it.each(["pretty", "md", "html"] as const)(
    "shows only the top 3 recommendations with a note about the rest in %s format",
    (format) => {
      const output = renderReport(makeResultWithFiveRecs(), { format });
      expect(output).toContain("Fix number 1");
      expect(output).toContain("Fix number 3");
      expect(output).not.toContain("Fix number 4");
      expect(output).toContain("2 more in JSON output");
    },
  );

  it.each(["pretty", "md", "html"] as const)(
    "omits the more-in-json note when 3 or fewer recommendations exist in %s format",
    (format) => {
      const output = renderReport(makeResult(), { format });
      expect(output).not.toContain("more in JSON output");
    },
  );

  it.each(["pretty", "md", "html"] as const)(
    "appends the non-additive footer under recommendations in %s format",
    (format) => {
      const output = renderReport(makeResultWithFiveRecs(), { format });
      expect(output).toContain(
        "gains do not stack additively, and each addition competes for the same content budget",
      );
    },
  );

  it("keeps every recommendation in json output", () => {
    const output = renderReport(makeResultWithFiveRecs(), { format: "json" });
    const parsed = JSON.parse(output);
    expect(parsed.recommendations).toHaveLength(5);
  });
});
