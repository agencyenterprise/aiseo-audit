import { describe, expect, it } from "vitest";
import { auditContentStructure } from "../../../src/modules/content-structure/index.js";
import { extractPage } from "../../../src/modules/extractor/service.js";

function buildPage(html: string) {
  return extractPage(html, "https://example.com/test");
}

function findFactor(
  name: string,
  result: ReturnType<typeof auditContentStructure>,
) {
  return result.category.factors.find((f) => f.name === name);
}

const paragraph = (words: number) => `<p>${"word ".repeat(words).trim()}</p>`;

describe("auditContentStructure", () => {
  describe("Heading Hierarchy", () => {
    it("scores 4+4+3=11 for one H1, two H2s, and H3s", () => {
      const html = `<body><h1>Title</h1><h2>A</h2><h2>B</h2><h3>Sub</h3>${paragraph(50)}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Heading Hierarchy", result)?.score).toBe(11);
    });

    it("scores 2 for multiple H1s (not exactly one)", () => {
      const html = `<body><h1>Title</h1><h1>Also Title</h1>${paragraph(50)}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Heading Hierarchy", result)?.score).toBe(2);
    });

    it("scores 2 for exactly one H2 (not two or more)", () => {
      const html = `<body><h1>Title</h1><h2>Single Section</h2>${paragraph(50)}</body>`;
      const result = auditContentStructure(buildPage(html));
      const score = findFactor("Heading Hierarchy", result)?.score;
      expect(score).toBe(6);
    });

    it("scores 0 for no headings at all", () => {
      const html = `<body>${paragraph(50)}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Heading Hierarchy", result)?.score).toBe(0);
    });
  });

  describe("Lists Presence", () => {
    it("scores 11 for 10+ list items", () => {
      const items = Array.from(
        { length: 12 },
        (_, i) => `<li>Item ${i}</li>`,
      ).join("");
      const html = `<body><ul>${items}</ul></body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Lists Presence", result)?.score).toBe(11);
    });

    it("scores 8 for 5-9 list items", () => {
      const items = Array.from(
        { length: 6 },
        (_, i) => `<li>Item ${i}</li>`,
      ).join("");
      const html = `<body><ul>${items}</ul></body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Lists Presence", result)?.score).toBe(8);
    });

    it("scores 4 for 1-4 list items", () => {
      const html = `<body><ul><li>A</li><li>B</li></ul></body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Lists Presence", result)?.score).toBe(4);
    });

    it("scores 0 for no list items", () => {
      const html = `<body>${paragraph(50)}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Lists Presence", result)?.score).toBe(0);
    });
  });

  describe("Tables Presence", () => {
    it("scores 8 for two or more tables", () => {
      const table = `<table><tr><td>x</td></tr></table>`;
      const html = `<body>${table}${table}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Tables Presence", result)?.score).toBe(8);
    });

    it("scores 5 for exactly one table", () => {
      const html = `<body><table><tr><td>x</td></tr></table></body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Tables Presence", result)?.score).toBe(5);
    });

    it("scores 0 and is neutral for no tables", () => {
      const html = `<body>${paragraph(50)}</body>`;
      const result = auditContentStructure(buildPage(html));
      const factor = findFactor("Tables Presence", result);
      expect(factor?.score).toBe(0);
      expect(factor?.status).toBe("neutral");
    });
  });

  describe("Paragraph Structure", () => {
    it("scores 11 for average paragraph length in ideal range (30-150 words)", () => {
      const html = `<body>${paragraph(80)}${paragraph(80)}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Paragraph Structure", result)?.score).toBe(11);
    });

    it("scores 7 for average paragraph length slightly outside ideal but under 200", () => {
      const html = `<body>${paragraph(20)}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Paragraph Structure", result)?.score).toBe(7);
    });

    it("scores 2 for very long paragraphs (200+ words average)", () => {
      const html = `<body>${paragraph(300)}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Paragraph Structure", result)?.score).toBe(2);
    });
  });

  describe("Scannability", () => {
    it("scores 11 for bold text, short paragraphs, and good heading ratio", () => {
      const html = `<body>
        <h2>Section A</h2>${paragraph(50)}
        <h2>Section B</h2>${paragraph(50)}
        <h2>Section C</h2>${paragraph(50)}
        <p><strong>Bold text here</strong></p>
      </body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Scannability", result)?.score).toBe(11);
    });

    it("scores 4 for only bold text with no other signals", () => {
      const html = `<body>
        <p><strong>Bold only</strong></p>
        ${paragraph(200)}
      </body>`;
      const result = auditContentStructure(buildPage(html));
      const factor = findFactor("Scannability", result);
      expect(factor?.score).toBeGreaterThan(0);
    });

    it("scores 0 for no bold, long paragraphs, and low heading ratio", () => {
      const html = `<body>${paragraph(200)}${paragraph(200)}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Scannability", result)?.score).toBe(0);
    });
  });

  describe("Section Length", () => {
    it("scores 12 for sections averaging 120-180 words", () => {
      const sectionText = "word ".repeat(150).trim();
      const html = `<body>
        <h2>Section One</h2><p>${sectionText}</p>
        <h2>Section Two</h2><p>${sectionText}</p>
      </body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Section Length", result)?.score).toBe(12);
    });

    it("scores 8 for sections averaging 80-119 words", () => {
      const sectionText = "word ".repeat(95).trim();
      const html = `<body>
        <h2>Section One</h2><p>${sectionText}</p>
        <h2>Section Two</h2><p>${sectionText}</p>
      </body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Section Length", result)?.score).toBe(8);
    });

    it("scores 4 for very short sections under 80 words", () => {
      const html = `<body>
        <h2>A</h2><p>Short section.</p>
        <h2>B</h2><p>Another short one.</p>
      </body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor("Section Length", result)?.score).toBe(4);
    });

    it("scores 0 and is neutral when there are no headings", () => {
      const html = `<body>${paragraph(100)}</body>`;
      const result = auditContentStructure(buildPage(html));
      const factor = findFactor("Section Length", result);
      expect(factor?.score).toBe(0);
      expect(factor?.status).toBe("neutral");
    });
  });

  describe("rawData", () => {
    it("includes section length data", () => {
      const html = `<body><h2>Section</h2>${paragraph(100)}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(result.rawData.sectionLengths).toBeDefined();
      expect(result.rawData.sectionLengths?.sectionCount).toBeGreaterThan(0);
    });
  });
});
