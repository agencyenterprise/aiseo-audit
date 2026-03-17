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

    it("does not count same-domain http links as external", () => {
      const html = `<html><body>
        <a href="https://example.com/page2">Internal link</a>
        <a href="https://other.com/page">External link</a>
      </body></html>`;
      const result = extractPage(html, "https://example.com");
      expect(result.stats.externalLinkCount).toBe(1);
      expect(result.externalLinks).toHaveLength(1);
      expect(result.externalLinks[0].url).toContain("other.com");
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

  describe("image alt text quality", () => {
    it("counts descriptive alt text as meaningful", () => {
      const html = `<html><body>
        <img src="a.jpg" alt="A chart showing user growth over time" />
        <img src="b.jpg" alt="Screenshot of the configuration panel" />
      </body></html>`;
      const result = extractPage(html, "https://example.com");

      expect(result.stats.imagesWithAlt).toBe(2);
    });

    it("does not count empty alt text", () => {
      const html = `<html><body>
        <img src="a.jpg" alt="" />
      </body></html>`;
      const result = extractPage(html, "https://example.com");

      expect(result.stats.imagesWithAlt).toBe(0);
    });

    it("does not count generic single-word alt values", () => {
      const html = `<html><body>
        <img src="a.jpg" alt="image" />
        <img src="b.jpg" alt="photo" />
        <img src="c.jpg" alt="logo" />
        <img src="d.jpg" alt="icon" />
      </body></html>`;
      const result = extractPage(html, "https://example.com");

      expect(result.stats.imagesWithAlt).toBe(0);
    });

    it("does not count alt text that is a single word", () => {
      const html = `<html><body>
        <img src="a.jpg" alt="diagram" />
      </body></html>`;
      const result = extractPage(html, "https://example.com");

      expect(result.stats.imagesWithAlt).toBe(0);
    });

    it("does not count alt text over 200 characters", () => {
      const longAlt = "word ".repeat(50).trim();
      const html = `<html><body>
        <img src="a.jpg" alt="${longAlt}" />
      </body></html>`;
      const result = extractPage(html, "https://example.com");

      expect(result.stats.imagesWithAlt).toBe(0);
    });

    it("counts only meaningful alt text when mixed with generic", () => {
      const html = `<html><body>
        <img src="a.jpg" alt="image" />
        <img src="b.jpg" alt="A descriptive caption for this image" />
        <img src="c.jpg" alt="" />
      </body></html>`;
      const result = extractPage(html, "https://example.com");

      expect(result.stats.imagesWithAlt).toBe(1);
    });
  });
});
