import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeUrl } from "../../src/modules/analyzer/service.js";
import { computeDiff } from "../../src/modules/diff/service.js";
import { httpGet } from "../../src/utils/http.js";
import { makeConfig } from "../helpers/config.js";
import { mockResponse, setupHttpMocks } from "../helpers/http.js";

vi.mock("../../src/utils/http.js");

const html = readFileSync(
  new URL("../fixtures/pages/well-structured.html", import.meta.url),
  "utf8",
);

describe("audit reliability regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHttpMocks({ pageHtml: html });
  });
  afterEach(() => vi.restoreAllMocks());

  it("fails eligibility for the audited path when robots.txt blocks it", async () => {
    setupHttpMocks({
      pageHtml: html,
      robotsTxt: "User-agent: *\nDisallow: /private/",
    });
    const result = await analyzeUrl(
      { url: "https://example.com/private/guide" },
      makeConfig(),
    );
    expect(result.stages?.technicalEligibility.status).toBe("fail");
    expect(result.overallScore).toBeLessThanOrEqual(25);
  });

  it("does not award access points when robots.txt could not be fetched", async () => {
    vi.mocked(httpGet).mockImplementation(async ({ url }) => {
      if (url.endsWith("/robots.txt")) throw new Error("Network failure");
      return mockResponse({ data: html, finalUrl: url });
    });
    const result = await analyzeUrl(
      { url: "https://example.com/guide" },
      makeConfig(),
    );
    const factor = result.categories.contentExtractability.factors.find(
      (entry) => entry.name === "AI Crawler Access",
    );
    expect(result.rawData.crawlerAccess?.unknown.length).toBeGreaterThan(0);
    expect(factor?.status).toBe("neutral");
    expect(factor?.value).toMatch(/unknown/i);
  });

  it("flags a score comparison changed only by category weights", async () => {
    const config = makeConfig();
    const baseline = await analyzeUrl(
      { url: "https://example.com/guide" },
      config,
    );
    const weights = Object.fromEntries(
      Object.keys(config.weights).map((key) => [
        key,
        key === "contentExtractability" ? 1 : 0,
      ]),
    ) as typeof config.weights;
    const current = await analyzeUrl(
      { url: "https://example.com/guide" },
      { ...config, weights },
    );
    expect(current.overallScore).not.toBe(baseline.overallScore);
    expect(computeDiff(current, baseline)).toMatchObject({
      comparison: { comparable: false },
    });
  });
});
