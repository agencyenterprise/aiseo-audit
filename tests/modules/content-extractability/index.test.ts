import { describe, expect, it } from "vitest";
import { auditContentExtractability } from "../../../src/modules/content-extractability/index.js";
import { findFactor } from "../../helpers/factors.js";
import { buildPage } from "../../helpers/page.js";
import type { FetchResultType } from "../../../src/modules/fetcher/schema.js";

const baseFetchResult: FetchResultType = {
  url: "https://example.com/test",
  finalUrl: "https://example.com/test",
  statusCode: 200,
  contentType: "text/html",
  html: "",
  fetchTimeMs: 100,
};

function padHeadToShrinkExtractRatio(
  metaCount: number,
  bodyText: string,
): string {
  const metas = Array.from(
    { length: metaCount },
    (_, i) =>
      `<meta name="pad${i}" content="padding-content-padding-content" />`,
  ).join("");
  return `<html><head>${metas}</head><body><p>${bodyText}</p></body></html>`;
}

describe("auditContentExtractability", () => {
  describe("Text Extraction Quality", () => {
    const bodyText = "word ".repeat(50).trim();

    it("scores 12 for extract ratio in optimal range (5-15%)", () => {
      const html = padHeadToShrinkExtractRatio(40, bodyText);
      const page = buildPage(html);
      const ratio = page.stats.cleanTextLength / page.stats.rawByteLength;

      expect(ratio).toBeGreaterThanOrEqual(0.05);
      expect(ratio).toBeLessThanOrEqual(0.15);

      const result = auditContentExtractability(page, baseFetchResult);
      expect(findFactor(result, "Text Extraction Quality")?.score).toBe(12);
    });

    it("scores 10 for extract ratio above 15%", () => {
      const html = padHeadToShrinkExtractRatio(0, bodyText);
      const page = buildPage(html);
      const ratio = page.stats.cleanTextLength / page.stats.rawByteLength;

      expect(ratio).toBeGreaterThan(0.15);

      const result = auditContentExtractability(page, baseFetchResult);
      expect(findFactor(result, "Text Extraction Quality")?.score).toBe(10);
    });

    it("scores 8 for extract ratio in minimal range (1-5%)", () => {
      const html = padHeadToShrinkExtractRatio(80, bodyText);
      const page = buildPage(html);
      const ratio = page.stats.cleanTextLength / page.stats.rawByteLength;

      expect(ratio).toBeGreaterThanOrEqual(0.01);
      expect(ratio).toBeLessThan(0.05);

      const result = auditContentExtractability(page, baseFetchResult);
      expect(findFactor(result, "Text Extraction Quality")?.score).toBe(8);
    });

    it("scores 2 for extract ratio below 1%", () => {
      const html = padHeadToShrinkExtractRatio(250, "hi");
      const page = buildPage(html);
      const ratio = page.stats.cleanTextLength / page.stats.rawByteLength;

      expect(ratio).toBeLessThan(0.01);

      const result = auditContentExtractability(page, baseFetchResult);
      expect(findFactor(result, "Text Extraction Quality")?.score).toBe(2);
    });
  });

  describe("Word Count Adequacy diagnostic", () => {
    it("reports the word count as an unscored info diagnostic", () => {
      const html = padHeadToShrinkExtractRatio(0, "word ".repeat(500).trim());
      const page = buildPage(html);
      const result = auditContentExtractability(page, baseFetchResult);
      const factor = findFactor(result, "Word Count Adequacy");

      expect(factor?.status).toBe("info");
      expect(factor?.score).toBe(0);
      expect(factor?.maxScore).toBe(0);
      expect(factor?.value).toContain("words");
    });
  });

  describe("Paywall Signals", () => {
    it("scores the full 8 for a page with no paywall barriers", () => {
      const html = `<body><p>Freely readable article text.</p></body>`;
      const result = auditContentExtractability(
        buildPage(html),
        baseFetchResult,
      );
      const factor = findFactor(result, "Paywall Signals");

      expect(factor?.score).toBe(8);
      expect(factor?.maxScore).toBe(8);
      expect(factor?.value).toBe("No paywall or login barriers detected");
    });

    it("scores 4 when exactly one paywall marker appears", () => {
      const html = `<body><div id="paywall"></div><p>Teaser text.</p></body>`;
      const result = auditContentExtractability(
        buildPage(html),
        baseFetchResult,
      );
      const factor = findFactor(result, "Paywall Signals");

      expect(factor?.score).toBe(4);
      expect(factor?.value).toBe("1 paywall marker found");
    });

    it("scores 0 when multiple markers pile up", () => {
      const html = `<body>
        <div id="paywall"></div>
        <p>Subscribe to continue reading this story.</p>
      </body>`;
      const result = auditContentExtractability(
        buildPage(html),
        baseFetchResult,
      );
      const factor = findFactor(result, "Paywall Signals");

      expect(factor?.score).toBe(0);
      expect(factor?.value).toBe("2 paywall markers found");
    });

    it("scores 0 when JSON-LD declares the page is not freely accessible", () => {
      const html = `<body>
        <script type="application/ld+json">{"@type":"Article","isAccessibleForFree":false}</script>
        <p>Article text.</p>
      </body>`;
      const result = auditContentExtractability(
        buildPage(html),
        baseFetchResult,
      );
      const factor = findFactor(result, "Paywall Signals");

      expect(factor?.score).toBe(0);
      expect(factor?.value).toBe("Page declares isAccessibleForFree: false");
    });
  });

  describe("Image Accessibility diagnostic", () => {
    it("reports alt coverage and figcaptions without scoring them", () => {
      const html = `<body>
        <figure><img src="a.png" alt="Chart showing results"><figcaption>Results</figcaption></figure>
        <img src="b.png">
      </body>`;
      const page = buildPage(html);
      const result = auditContentExtractability(page, baseFetchResult);
      const factor = findFactor(result, "Image Accessibility");

      expect(factor?.status).toBe("info");
      expect(factor?.score).toBe(0);
      expect(factor?.maxScore).toBe(0);
      expect(factor?.value).toContain("1/2 images have alt text");
      expect(factor?.value).toContain("1 figcaptions");
    });

    it("notes when the page has no images", () => {
      const html = `<body><p>No images here.</p></body>`;
      const page = buildPage(html);
      const result = auditContentExtractability(page, baseFetchResult);
      const factor = findFactor(result, "Image Accessibility");

      expect(factor?.status).toBe("info");
      expect(factor?.value).toBe("No images found");
    });
  });

  describe("category scoring", () => {
    it("counts only fetch, extraction, boilerplate, and paywall toward maxScore", () => {
      const html = padHeadToShrinkExtractRatio(0, "word ".repeat(500).trim());
      const page = buildPage(html);
      const result = auditContentExtractability(page, baseFetchResult);

      expect(result.category.maxScore).toBe(44);
    });
  });
});
