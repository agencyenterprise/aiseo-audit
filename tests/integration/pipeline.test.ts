import axios from "axios";
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

vi.mock("axios");
const mockedGet = axios.get as Mock;
const mockedHead = axios.head as Mock;

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
      const html = loadFixture("well-structured.html");

      mockedGet.mockImplementation(async (url: string) => {
        if (url.includes("robots.txt")) {
          return { status: 200, data: "User-agent: *\nAllow: /", headers: {} };
        }
        if (url.includes("llms.txt") || url.includes("llms-full.txt")) {
          return { status: 404, data: "", headers: {} };
        }
        return {
          status: 200,
          data: html,
          headers: { "content-type": "text/html" },
        };
      });

      mockedHead.mockImplementation(async () => {
        return { status: 404, data: "", headers: {} };
      });

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

    it("scores well-structured content higher", async () => {
      const wellStructuredHtml = loadFixture("well-structured.html");
      const minimalHtml = loadFixture("minimal.html");

      mockedGet.mockImplementation(async (url: string, opts: any) => {
        if (url.includes("robots.txt")) {
          return { status: 200, data: "User-agent: *\nAllow: /", headers: {} };
        }
        if (url.includes("llms.txt") || url.includes("llms-full.txt")) {
          return { status: 404, data: "", headers: {} };
        }
        const html = url.includes("good") ? wellStructuredHtml : minimalHtml;
        return {
          status: 200,
          data: html,
          headers: { "content-type": "text/html" },
        };
      });

      mockedHead.mockImplementation(async () => {
        return { status: 404, data: "", headers: {} };
      });

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
      const html = loadFixture("minimal.html");

      mockedGet.mockImplementation(async (url: string) => {
        if (url.includes("robots.txt")) {
          return { status: 200, data: "User-agent: *\nAllow: /", headers: {} };
        }
        return {
          status: 200,
          data: html,
          headers: { "content-type": "text/html" },
        };
      });

      mockedHead.mockImplementation(async () => {
        return { status: 404, data: "", headers: {} };
      });

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
      const html = loadFixture("well-structured.html");

      mockedGet.mockImplementation(async (url: string) => {
        if (url.includes("robots.txt")) {
          return { status: 200, data: "User-agent: *\nAllow: /", headers: {} };
        }
        return {
          status: 200,
          data: html,
          headers: { "content-type": "text/html" },
        };
      });

      mockedHead.mockImplementation(async () => {
        return { status: 404, data: "", headers: {} };
      });

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
      const html = loadFixture("blog-post.html");

      mockedGet.mockImplementation(async (url: string) => {
        if (url.includes("robots.txt")) {
          return { status: 200, data: "User-agent: *\nAllow: /", headers: {} };
        }
        return {
          status: 200,
          data: html,
          headers: { "content-type": "text/html" },
        };
      });

      mockedHead.mockImplementation(async () => {
        return { status: 404, data: "", headers: {} };
      });

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

  describe("weights", () => {
    it("applies custom weights to overall score", async () => {
      const html = loadFixture("well-structured.html");

      mockedGet.mockImplementation(async (url: string) => {
        if (url.includes("robots.txt")) {
          return { status: 200, data: "User-agent: *\nAllow: /", headers: {} };
        }
        return {
          status: 200,
          data: html,
          headers: { "content-type": "text/html" },
        };
      });

      mockedHead.mockImplementation(async () => {
        return { status: 404, data: "", headers: {} };
      });

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
