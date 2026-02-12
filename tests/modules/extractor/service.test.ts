import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractPage } from "../../../src/modules/extractor/service.js";

const fixturesDir = join(__dirname, "../../fixtures/pages");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

describe("extractPage", () => {
  describe("with well-structured page", () => {
    const html = loadFixture("well-structured.html");
    const result = extractPage(html, "https://example.com/geo-guide");

    it("extracts title", () => {
      expect(result.title).toContain("Generative Engine Optimization");
    });

    it("extracts meta description", () => {
      expect(result.metaDescription).toContain("optimize your website");
    });

    it("extracts clean text without HTML", () => {
      expect(result.cleanText).not.toContain("<");
      expect(result.cleanText).not.toContain(">");
      expect(result.cleanText.length).toBeGreaterThan(0);
    });

    it("counts headings correctly", () => {
      expect(result.stats.h1Count).toBe(1);
      expect(result.stats.h2Count).toBeGreaterThan(0);
      expect(result.stats.headingCount).toBeGreaterThan(1);
    });

    it("counts lists", () => {
      expect(result.stats.listCount).toBeGreaterThan(0);
      expect(result.stats.listItemCount).toBeGreaterThan(0);
    });

    it("counts tables", () => {
      expect(result.stats.tableCount).toBeGreaterThan(0);
    });

    it("counts words and sentences", () => {
      expect(result.stats.wordCount).toBeGreaterThan(100);
      expect(result.stats.sentenceCount).toBeGreaterThan(5);
    });

    it("calculates boilerplate ratio", () => {
      expect(result.stats.boilerplateRatio).toBeGreaterThanOrEqual(0);
      expect(result.stats.boilerplateRatio).toBeLessThanOrEqual(1);
    });

    it("preserves cheerio instance", () => {
      expect(result.$).toBeDefined();
      expect(typeof result.$).toBe("function");
    });
  });

  describe("with minimal page", () => {
    const html = loadFixture("minimal.html");
    const result = extractPage(html, "https://example.com");

    it("extracts basic title", () => {
      expect(result.title).toBe("Welcome");
    });

    it("has minimal content stats", () => {
      expect(result.stats.h1Count).toBe(1);
      expect(result.stats.h2Count).toBe(0);
      expect(result.stats.listCount).toBe(0);
      expect(result.stats.tableCount).toBe(0);
    });

    it("has low word count", () => {
      expect(result.stats.wordCount).toBeLessThan(50);
    });
  });

  describe("with blog post page", () => {
    const html = loadFixture("blog-post.html");
    const result = extractPage(html, "https://example.com/blog/ml-basics");

    it("extracts title from title tag", () => {
      expect(result.title).toContain("Machine Learning");
    });

    it("extracts meta description", () => {
      expect(result.metaDescription).toContain("introduction");
    });

    it("counts external links", () => {
      expect(result.stats.externalLinkCount).toBeGreaterThanOrEqual(0);
    });

    it("has moderate content", () => {
      expect(result.stats.wordCount).toBeGreaterThan(50);
      expect(result.stats.h2Count).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("handles empty body", () => {
      const html =
        "<html><head><title>Empty</title></head><body></body></html>";
      const result = extractPage(html, "https://example.com");

      expect(result.title).toBe("Empty");
      expect(result.stats.wordCount).toBe(0);
    });

    it("handles missing title", () => {
      const html = "<html><body><p>Content</p></body></html>";
      const result = extractPage(html, "https://example.com");

      expect(result.title).toBe("");
    });

    it("uses og:title as fallback", () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="OG Title">
          </head>
          <body><p>Content</p></body>
        </html>
      `;
      const result = extractPage(html, "https://example.com");

      expect(result.title).toBe("OG Title");
    });
  });
});
