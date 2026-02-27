import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyzerResultType } from "../../../src/modules/analyzer/schema.js";
import type { DomainSignalsType } from "../../../src/modules/audits/schema.js";

vi.mock("../../../src/modules/analyzer/service.js", () => ({
  fetchDomainSignals: vi.fn(),
  analyzeUrlWithSignals: vi.fn(),
}));

vi.mock("../../../src/utils/http.js", () => ({
  httpGet: vi.fn(),
}));

vi.mock("../../../src/modules/fetcher/service.js", () => ({
  fetchUrl: vi.fn(),
}));

import {
  analyzeUrlWithSignals,
  fetchDomainSignals,
} from "../../../src/modules/analyzer/service.js";
import { fetchUrl } from "../../../src/modules/fetcher/service.js";
import { analyzeSitemap } from "../../../src/modules/sitemap/service.js";
import { httpGet } from "../../../src/utils/http.js";

const mockConfig = {
  timeout: 30000,
  userAgent: "test-agent",
  format: "pretty" as const,
  weights: {
    contentExtractability: 1,
    contentStructure: 1,
    answerability: 1,
    entityClarity: 1,
    groundingSignals: 1,
    authorityContext: 1,
    readabilityForCompression: 1,
  },
};

const mockDomainSignals: DomainSignalsType = {
  signalsBase: "https://example.com",
  robotsTxt: "User-agent: *\nAllow: /",
  llmsTxtExists: false,
  llmsFullTxtExists: false,
};

function makeMockAnalyzerResult(
  url: string,
  score: number,
): AnalyzerResultType {
  return {
    url,
    signalsBase: "https://example.com",
    analyzedAt: "2026-02-11T12:00:00.000Z",
    overallScore: score,
    grade: "B",
    totalPoints: 300,
    maxPoints: 420,
    categories: {
      contentExtractability: {
        name: "Content Extractability",
        key: "contentExtractability",
        score: 50,
        maxScore: 72,
        factors: [],
      },
      contentStructure: {
        name: "Content Structure",
        key: "contentStructure",
        score: 40,
        maxScore: 64,
        factors: [],
      },
      answerability: {
        name: "Answerability",
        key: "answerability",
        score: 40,
        maxScore: 64,
        factors: [],
      },
      entityClarity: {
        name: "Entity Clarity",
        key: "entityClarity",
        score: 40,
        maxScore: 60,
        factors: [],
      },
      groundingSignals: {
        name: "Grounding Signals",
        key: "groundingSignals",
        score: 40,
        maxScore: 60,
        factors: [],
      },
      authorityContext: {
        name: "Authority Context",
        key: "authorityContext",
        score: 50,
        maxScore: 82,
        factors: [],
      },
      readabilityForCompression: {
        name: "Readability for Compression",
        key: "readabilityForCompression",
        score: 40,
        maxScore: 60,
        factors: [],
      },
    },
    recommendations: [
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
      version: "1.0.0",
      analysisDurationMs: 100,
    },
  };
}

const standardSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/page-one</loc></url>
  <url><loc>https://example.com/page-two</loc></url>
</urlset>`;

const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-blog.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
</sitemapindex>`;

const childSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/blog/post-one</loc></url>
</urlset>`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchDomainSignals).mockResolvedValue(mockDomainSignals);
  vi.mocked(fetchUrl).mockResolvedValue({
    url: "https://example.com/page-one",
    finalUrl: "https://example.com/page-one",
    statusCode: 200,
    contentType: "text/html",
    html: "<html><body>Test</body></html>",
    byteLength: 100,
    fetchTimeMs: 50,
    redirected: false,
  });
});

describe("analyzeSitemap", () => {
  describe("sitemap parsing", () => {
    it("fetches domain signals once from the sitemap URL", async () => {
      vi.mocked(httpGet).mockResolvedValue({
        status: 200,
        data: standardSitemapXml,
        headers: {},
        finalUrl: "https://example.com/sitemap.xml",
      });
      vi.mocked(analyzeUrlWithSignals).mockResolvedValue(
        makeMockAnalyzerResult("https://example.com/page-one", 70),
      );

      await analyzeSitemap(
        { sitemapUrl: "https://example.com/sitemap.xml" },
        mockConfig,
      );

      expect(fetchDomainSignals).toHaveBeenCalledTimes(1);
      expect(fetchDomainSignals).toHaveBeenCalledWith(
        "https://example.com",
        expect.any(Number),
        expect.any(String),
      );
    });

    it("uses --signals-base override when provided", async () => {
      vi.mocked(httpGet).mockResolvedValue({
        status: 200,
        data: standardSitemapXml,
        headers: {},
        finalUrl: "https://example.com/sitemap.xml",
      });
      vi.mocked(analyzeUrlWithSignals).mockResolvedValue(
        makeMockAnalyzerResult("https://example.com/page-one", 70),
      );

      await analyzeSitemap(
        {
          sitemapUrl: "https://example.com/sitemap.xml",
          signalsBase: "https://example.com",
        },
        mockConfig,
      );

      expect(fetchDomainSignals).toHaveBeenCalledWith(
        "https://example.com",
        expect.any(Number),
        expect.any(String),
      );
    });

    it("audits each URL in the sitemap", async () => {
      vi.mocked(httpGet).mockResolvedValue({
        status: 200,
        data: standardSitemapXml,
        headers: {},
        finalUrl: "https://example.com/sitemap.xml",
      });
      vi.mocked(analyzeUrlWithSignals).mockResolvedValue(
        makeMockAnalyzerResult("https://example.com/page-one", 70),
      );

      const result = await analyzeSitemap(
        { sitemapUrl: "https://example.com/sitemap.xml" },
        mockConfig,
      );

      expect(result.totalUrls).toBe(2);
      expect(analyzeUrlWithSignals).toHaveBeenCalledTimes(2);
    });

    it("flattens sitemap index into individual URLs", async () => {
      vi.mocked(httpGet)
        .mockResolvedValueOnce({
          status: 200,
          data: sitemapIndexXml,
          headers: {},
          finalUrl: "https://example.com/sitemap.xml",
        })
        .mockResolvedValue({
          status: 200,
          data: childSitemapXml,
          headers: {},
          finalUrl: "https://example.com/sitemap-blog.xml",
        });
      vi.mocked(analyzeUrlWithSignals).mockResolvedValue(
        makeMockAnalyzerResult("https://example.com/blog/post-one", 70),
      );

      const result = await analyzeSitemap(
        { sitemapUrl: "https://example.com/sitemap.xml" },
        mockConfig,
      );

      expect(result.totalUrls).toBe(2);
    });

    it("throws when sitemap returns non-200", async () => {
      vi.mocked(httpGet).mockResolvedValue({
        status: 404,
        data: "",
        headers: {},
        finalUrl: "https://example.com/sitemap.xml",
      });

      await expect(
        analyzeSitemap(
          { sitemapUrl: "https://example.com/sitemap.xml" },
          mockConfig,
        ),
      ).rejects.toThrow("Failed to fetch sitemap: HTTP 404");
    });
  });

  describe("result aggregation", () => {
    it("computes average score from successful results", async () => {
      vi.mocked(httpGet).mockResolvedValue({
        status: 200,
        data: standardSitemapXml,
        headers: {},
        finalUrl: "https://example.com/sitemap.xml",
      });
      vi.mocked(analyzeUrlWithSignals)
        .mockResolvedValueOnce(
          makeMockAnalyzerResult("https://example.com/page-one", 60),
        )
        .mockResolvedValueOnce(
          makeMockAnalyzerResult("https://example.com/page-two", 80),
        );

      const result = await analyzeSitemap(
        { sitemapUrl: "https://example.com/sitemap.xml" },
        mockConfig,
      );

      expect(result.averageScore).toBe(70);
      expect(result.succeededCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it("records failed URLs without crashing", async () => {
      vi.mocked(httpGet).mockResolvedValue({
        status: 200,
        data: standardSitemapXml,
        headers: {},
        finalUrl: "https://example.com/sitemap.xml",
      });
      vi.mocked(analyzeUrlWithSignals)
        .mockResolvedValueOnce(
          makeMockAnalyzerResult("https://example.com/page-one", 70),
        )
        .mockRejectedValueOnce(new Error("Connection timeout"));

      const result = await analyzeSitemap(
        { sitemapUrl: "https://example.com/sitemap.xml" },
        mockConfig,
      );

      expect(result.totalUrls).toBe(2);
      expect(result.succeededCount).toBe(1);
      expect(result.failedCount).toBe(1);

      const failed = result.urlResults.find((r) => r.status === "failed");
      expect(failed).toBeDefined();
      if (failed?.status === "failed") {
        expect(failed.error).toBe("Connection timeout");
      }
    });

    it("computes category averages across successful URLs", async () => {
      vi.mocked(httpGet).mockResolvedValue({
        status: 200,
        data: standardSitemapXml,
        headers: {},
        finalUrl: "https://example.com/sitemap.xml",
      });
      vi.mocked(analyzeUrlWithSignals)
        .mockResolvedValueOnce(
          makeMockAnalyzerResult("https://example.com/page-one", 60),
        )
        .mockResolvedValueOnce(
          makeMockAnalyzerResult("https://example.com/page-two", 80),
        );

      const result = await analyzeSitemap(
        { sitemapUrl: "https://example.com/sitemap.xml" },
        mockConfig,
      );

      expect(result.categoryAverages).toBeDefined();
      expect(Object.keys(result.categoryAverages).length).toBeGreaterThan(0);
    });

    it("includes sitemapUrl and signalsBase in result", async () => {
      vi.mocked(httpGet).mockResolvedValue({
        status: 200,
        data: standardSitemapXml,
        headers: {},
        finalUrl: "https://example.com/sitemap.xml",
      });
      vi.mocked(analyzeUrlWithSignals).mockResolvedValue(
        makeMockAnalyzerResult("https://example.com/page-one", 70),
      );

      const result = await analyzeSitemap(
        { sitemapUrl: "https://example.com/sitemap.xml" },
        mockConfig,
      );

      expect(result.sitemapUrl).toBe("https://example.com/sitemap.xml");
      expect(result.signalsBase).toBe(mockDomainSignals.signalsBase);
    });
  });
});
