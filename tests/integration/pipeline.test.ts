import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { analyzeUrl } from "../../src/modules/analyzer/service.js";
import { loadConfig } from "../../src/modules/config/service.js";

vi.mock("../../src/utils/http.js");

import { httpGet, httpProbe } from "../../src/utils/http.js";
import { mockResponse, setupHttpMocks } from "../helpers/http.js";
const mockedGet = httpGet as Mock;
const mockedProbe = httpProbe as Mock;

const fixturesDir = join(__dirname, "../fixtures/pages");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

describe("Pipeline Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("analyzeUrl with well-structured page", () => {
    it("produces valid result shape", async () => {
      setupHttpMocks({ pageHtml: loadFixture("well-structured.html") });

      const config = await loadConfig();
      const result = await analyzeUrl(
        { url: "https://example.com/test", timeout: 5000, userAgent: "Test" },
        config,
      );

      expect(result).toBeDefined();
      expect(result.url).toBe("https://example.com/test");
      expect(typeof result.overallScore).toBe("number");
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.grade).toMatch(/^[A-F][+-]?$/);
      expect(result.categories).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.meta.version).toBeDefined();
      expect(typeof result.meta.analysisDurationMs).toBe("number");
    });

    it("fetches domain signals from the origin, not the page path", async () => {
      setupHttpMocks({ pageHtml: loadFixture("well-structured.html") });

      const config = await loadConfig();
      const result = await analyzeUrl(
        {
          url: "https://example.com/blog/deep/post",
          timeout: 5000,
          userAgent: "Test",
        },
        config,
      );

      expect(result.signalsBase).toBe("https://example.com");
      const robotsCall = mockedGet.mock.calls.find(([opts]) =>
        (opts as { url: string }).url.includes("robots.txt"),
      );
      expect(robotsCall?.[0]).toMatchObject({
        url: "https://example.com/robots.txt",
      });
    });

    it("detects llms.txt when the probe finds it", async () => {
      setupHttpMocks({
        pageHtml: loadFixture("well-structured.html"),
        llmsTxtStatus: 200,
      });

      const config = await loadConfig();
      const result = await analyzeUrl(
        { url: "https://example.com/test", timeout: 5000, userAgent: "Test" },
        config,
      );

      expect(result.rawData.llmsTxt).toMatchObject({
        llmsTxtExists: true,
        llmsFullTxtExists: true,
      });
    });

    it("scores well-structured content higher", async () => {
      const wellStructuredHtml = loadFixture("well-structured.html");
      const minimalHtml = loadFixture("minimal.html");

      mockedGet.mockImplementation(async (opts: { url: string }) => {
        if (opts.url.includes("robots.txt")) {
          return mockResponse({
            status: 200,
            data: "User-agent: *\nAllow: /",
            finalUrl: opts.url,
          });
        }
        const html = opts.url.includes("good")
          ? wellStructuredHtml
          : minimalHtml;
        return mockResponse({
          status: 200,
          data: html,
          headers: { "content-type": "text/html" },
          finalUrl: opts.url,
        });
      });
      mockedProbe.mockImplementation(async (opts: { url: string }) =>
        mockResponse({ status: 404, finalUrl: opts.url }),
      );

      const config = await loadConfig();

      const goodResult = await analyzeUrl(
        { url: "https://example.com/good", timeout: 5000, userAgent: "Test" },
        config,
      );

      const badResult = await analyzeUrl(
        { url: "https://example.com/bad", timeout: 5000, userAgent: "Test" },
        config,
      );

      expect(goodResult.overallScore).toBeGreaterThan(badResult.overallScore);
    });

    it("generates recommendations for low-scoring factors", async () => {
      setupHttpMocks({ pageHtml: loadFixture("minimal.html") });

      const config = await loadConfig();
      const result = await analyzeUrl(
        {
          url: "https://example.com/minimal",
          timeout: 5000,
          userAgent: "Test",
        },
        config,
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].priority).toBeDefined();
      expect(result.recommendations[0].recommendation).toBeDefined();
    });
  });

  describe("category scores", () => {
    it("includes all 7 categories", async () => {
      setupHttpMocks({ pageHtml: loadFixture("well-structured.html") });

      const config = await loadConfig();
      const result = await analyzeUrl(
        { url: "https://example.com/test", timeout: 5000, userAgent: "Test" },
        config,
      );

      const categoryKeys = Object.keys(result.categories);

      expect(categoryKeys).toContain("contentExtractability");
      expect(categoryKeys).toContain("contentStructure");
      expect(categoryKeys).toContain("answerability");
      expect(categoryKeys).toContain("entityClarity");
      expect(categoryKeys).toContain("groundingSignals");
      expect(categoryKeys).toContain("authorityContext");
      expect(categoryKeys).toContain("readabilityForCompression");
    });

    it("category scores sum to totalPoints", async () => {
      setupHttpMocks({ pageHtml: loadFixture("blog-post.html") });

      const config = await loadConfig();
      const result = await analyzeUrl(
        { url: "https://example.com/blog", timeout: 5000, userAgent: "Test" },
        config,
      );

      const categorySum = Object.values(result.categories).reduce(
        (sum, cat) => sum + cat.score,
        0,
      );

      expect(categorySum).toBe(result.totalPoints);
    });
  });

  describe("broken pages", () => {
    it("produces a partial report for 404 pages", async () => {
      setupHttpMocks({
        pageHtml: "<html><body><h1>Not Found</h1></body></html>",
        pageStatus: 404,
      });

      const config = await loadConfig();
      const result = await analyzeUrl(
        {
          url: "https://example.com/missing",
          timeout: 5000,
          userAgent: "Test",
        },
        config,
      );

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.categories.contentExtractability).toBeDefined();
      expect(
        result.categories.contentExtractability.factors.find(
          (f) => f.name === "Fetch Success",
        )?.score,
      ).toBe(0);
    });
  });

  describe("weights", () => {
    it("applies custom weights to overall score", async () => {
      setupHttpMocks({ pageHtml: loadFixture("well-structured.html") });

      const defaultConfig = await loadConfig();
      const customConfig = {
        ...defaultConfig,
        weights: {
          ...defaultConfig.weights,
          contentExtractability: 10,
          answerability: 0,
        },
      };

      const defaultResult = await analyzeUrl(
        { url: "https://example.com/test", timeout: 5000, userAgent: "Test" },
        defaultConfig,
      );

      const customResult = await analyzeUrl(
        { url: "https://example.com/test", timeout: 5000, userAgent: "Test" },
        customConfig,
      );

      expect(customResult.overallScore).not.toBe(defaultResult.overallScore);
    });
  });
});
