import { describe, expect, it } from "vitest";
import { auditContentStructure } from "../../../src/modules/content-structure/index.js";
import { findFactor } from "../../helpers/factors.js";
import { buildPage, paragraph } from "../../helpers/page.js";

describe("auditContentStructure", () => {
  describe("Heading Hierarchy", () => {
    it("scores 4+4+3=11 for one H1, two H2s, and H3s", () => {
      const html = `<body><h1>Title</h1><h2>A</h2><h2>B</h2><h3>Sub</h3>${paragraph(50)}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor(result, "Heading Hierarchy")?.score).toBe(11);
    });

    it("scores 2 for multiple H1s (not exactly one)", () => {
      const html = `<body><h1>Title</h1><h1>Also Title</h1>${paragraph(50)}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor(result, "Heading Hierarchy")?.score).toBe(2);
    });

    it("scores 6 when an H1 is present but only one H2", () => {
      const html = `<body><h1>Title</h1><h2>Single Section</h2>${paragraph(50)}</body>`;
      const result = auditContentStructure(buildPage(html));
      const score = findFactor(result, "Heading Hierarchy")?.score;
      expect(score).toBe(6);
    });

    it("scores 0 for no headings at all", () => {
      const html = `<body>${paragraph(50)}</body>`;
      const result = auditContentStructure(buildPage(html));
      expect(findFactor(result, "Heading Hierarchy")?.score).toBe(0);
    });
  });

  describe("demoted diagnostics", () => {
    const html = `<body>
      <h1>Title</h1>
      <h2>Section</h2>
      <ul><li>One</li><li>Two</li><li>Three</li></ul>
      <table><tr><td>x</td></tr></table>
      <p><strong>Bold lead</strong></p>
      ${paragraph(80)}
    </body>`;

    it.each([
      "Lists Presence",
      "Tables Presence",
      "Paragraph Structure",
      "Scannability",
      "Section Length",
    ])("reports %s as an unscored info diagnostic", (name) => {
      const result = auditContentStructure(buildPage(html));
      const factor = findFactor(result, name);
      expect(factor?.status).toBe("info");
      expect(factor?.score).toBe(0);
      expect(factor?.maxScore).toBe(0);
    });

    it("excludes diagnostics from the category maxScore, leaving only Heading Hierarchy", () => {
      const result = auditContentStructure(buildPage(html));
      expect(result.category.maxScore).toBe(11);
    });

    it("describes list and table counts in the diagnostic values", () => {
      const result = auditContentStructure(buildPage(html));
      expect(findFactor(result, "Lists Presence")?.value).toContain(
        "3 list items",
      );
      expect(findFactor(result, "Tables Presence")?.value).toContain(
        "1 table(s)",
      );
    });

    it("reports missing headed sections in the Section Length diagnostic", () => {
      const result = auditContentStructure(
        buildPage(`<body>${paragraph(100)}</body>`),
      );
      expect(findFactor(result, "Section Length")?.value).toBe(
        "No headed sections found",
      );
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
