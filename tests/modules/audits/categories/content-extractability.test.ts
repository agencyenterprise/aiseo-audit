import { describe, expect, it } from "vitest";
import { auditContentExtractability } from "../../../../src/modules/audits/categories/content-extractability.js";
import { extractPage } from "../../../../src/modules/extractor/service.js";
import type { FetchResultType } from "../../../../src/modules/fetcher/schema.js";

function buildPage(html: string) {
  return extractPage(html, "https://example.com/test");
}

const baseFetchResult: FetchResultType = {
  url: "https://example.com/test",
  finalUrl: "https://example.com/test",
  statusCode: 200,
  contentType: "text/html",
  html: "",
  byteLength: 0,
  fetchTimeMs: 100,
  redirected: false,
};

function findFactor(
  name: string,
  result: ReturnType<typeof auditContentExtractability>,
) {
  return result.category.factors.find((f) => f.name === name);
}

// Meta tags in <head> contribute to rawByteLength but not cleanTextLength,
// allowing precise control over extractRatio without affecting word count.
function buildHtmlWithMetaPadding(metaCount: number, bodyText: string): string {
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

    it("scores 12 for extract ratio in optimal range (5–15%)", () => {
      // n=40 meta tags → rawByteLength ≈ 2805, ratio ≈ 0.089
      const html = buildHtmlWithMetaPadding(40, bodyText);
      const page = buildPage(html);
      const ratio = page.stats.cleanTextLength / page.stats.rawByteLength;

      expect(ratio).toBeGreaterThanOrEqual(0.05);
      expect(ratio).toBeLessThanOrEqual(0.15);

      const result = auditContentExtractability(page, baseFetchResult);
      expect(findFactor("Text Extraction Quality", result)?.score).toBe(12);
    });

    it("scores 10 for extract ratio above 15%", () => {
      // No padding → minimal markup, ratio ≈ 0.84
      const html = buildHtmlWithMetaPadding(0, bodyText);
      const page = buildPage(html);
      const ratio = page.stats.cleanTextLength / page.stats.rawByteLength;

      expect(ratio).toBeGreaterThan(0.15);

      const result = auditContentExtractability(page, baseFetchResult);
      expect(findFactor("Text Extraction Quality", result)?.score).toBe(10);
    });

    it("scores 8 for extract ratio in minimal range (1–5%)", () => {
      // n=80 meta tags → rawByteLength ≈ 5325, ratio ≈ 0.047
      const html = buildHtmlWithMetaPadding(80, bodyText);
      const page = buildPage(html);
      const ratio = page.stats.cleanTextLength / page.stats.rawByteLength;

      expect(ratio).toBeGreaterThanOrEqual(0.01);
      expect(ratio).toBeLessThan(0.05);

      const result = auditContentExtractability(page, baseFetchResult);
      expect(findFactor("Text Extraction Quality", result)?.score).toBe(8);
    });

    it("scores 2 for extract ratio below 1%", () => {
      // n=250 meta tags + tiny body → rawByteLength ≈ 15938, ratio ≈ 0.00013
      const html = buildHtmlWithMetaPadding(250, "hi");
      const page = buildPage(html);
      const ratio = page.stats.cleanTextLength / page.stats.rawByteLength;

      expect(ratio).toBeLessThan(0.01);

      const result = auditContentExtractability(page, baseFetchResult);
      expect(findFactor("Text Extraction Quality", result)?.score).toBe(2);
    });
  });

  describe("Word Count Adequacy", () => {
    it("scores 12 for word count in optimal range (300–3000)", () => {
      const html = buildHtmlWithMetaPadding(0, "word ".repeat(500).trim());
      const page = buildPage(html);

      expect(page.stats.wordCount).toBeGreaterThanOrEqual(300);
      expect(page.stats.wordCount).toBeLessThanOrEqual(3000);

      const result = auditContentExtractability(page, baseFetchResult);
      expect(findFactor("Word Count Adequacy", result)?.score).toBe(12);
    });

    it("scores 10 for word count above 3000", () => {
      const html = buildHtmlWithMetaPadding(0, "word ".repeat(3100).trim());
      const page = buildPage(html);

      expect(page.stats.wordCount).toBeGreaterThan(3000);

      const result = auditContentExtractability(page, baseFetchResult);
      expect(findFactor("Word Count Adequacy", result)?.score).toBe(10);
    });

    it("scores 8 for word count in minimal range (100–299)", () => {
      const html = buildHtmlWithMetaPadding(0, "word ".repeat(150).trim());
      const page = buildPage(html);

      expect(page.stats.wordCount).toBeGreaterThanOrEqual(100);
      expect(page.stats.wordCount).toBeLessThan(300);

      const result = auditContentExtractability(page, baseFetchResult);
      expect(findFactor("Word Count Adequacy", result)?.score).toBe(8);
    });

    it("scores 2 for word count below 100", () => {
      const html = buildHtmlWithMetaPadding(0, "word ".repeat(10).trim());
      const page = buildPage(html);

      expect(page.stats.wordCount).toBeLessThan(100);

      const result = auditContentExtractability(page, baseFetchResult);
      expect(findFactor("Word Count Adequacy", result)?.score).toBe(2);
    });
  });
});
