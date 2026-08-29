import { describe, expect, it } from "vitest";
import { auditStructuralAlignment } from "../../../src/modules/structural-alignment/index.js";
import { findFactor } from "../../helpers/factors.js";
import { buildPage } from "../../helpers/page.js";

const BODY = [
  "<p>Acme Widgets designs solar energy systems for modern homes.</p>",
  "<p>Our battery storage products pair with grid infrastructure upgrades.</p>",
  "<p>Renewable power adoption keeps growing across the industry.</p>",
].join("");

const BODY_ENTITIES = {
  people: [],
  organizations: ["Acme Widgets"],
  places: [],
  topics: [
    "solar energy",
    "battery storage",
    "grid infrastructure",
    "renewable power",
  ],
};

const NO_ENTITIES = {
  people: [],
  organizations: [],
  places: [],
  topics: [],
};

const ALL_FIVE_TERMS =
  "Acme Widgets solar energy battery storage grid infrastructure renewable power";
const TWO_OF_FIVE_TERMS = "Acme Widgets solar energy guide";
const ONE_OF_FIVE_TERMS = "Acme Widgets homepage";
const NONE_OF_THE_TERMS = "Completely unrelated headline";

function pageWith(headHtml: string, bodyHtml = BODY) {
  return buildPage(
    `<html><head>${headHtml}</head><body>${bodyHtml}</body></html>`,
  );
}

function metaTag(content: string) {
  return `<meta name="description" content="${content}">`;
}

function jsonLdScript(json: string) {
  return `<script type="application/ld+json">${json}</script>`;
}

describe("auditStructuralAlignment", () => {
  describe("Title Entity Alignment", () => {
    it("awards the full 12 when the title covers every salient term", () => {
      const page = pageWith(`<title>${ALL_FIVE_TERMS}</title>`);
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      const factor = findFactor(result, "Title Entity Alignment");
      expect(factor?.score).toBe(12);
      expect(factor?.maxScore).toBe(12);
    });

    it("awards 7 when the title covers two of the five salient terms", () => {
      const page = pageWith(`<title>${TWO_OF_FIVE_TERMS}</title>`);
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      const factor = findFactor(result, "Title Entity Alignment");
      expect(factor?.score).toBe(7);
      expect(factor?.value).toBe(
        "40% of the body's key terms appear in the title",
      );
    });

    it("awards 4 when the title covers one of the five salient terms", () => {
      const page = pageWith(`<title>${ONE_OF_FIVE_TERMS}</title>`);
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      expect(findFactor(result, "Title Entity Alignment")?.score).toBe(4);
    });

    it("awards 0 when the title shares nothing with the salient terms", () => {
      const page = pageWith(`<title>${NONE_OF_THE_TERMS}</title>`);
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      const factor = findFactor(result, "Title Entity Alignment");
      expect(factor?.score).toBe(0);
      expect(factor?.status).toBe("critical");
    });

    it("goes neutral with score 0 when the body offers no salient terms", () => {
      const page = pageWith(`<title>${ALL_FIVE_TERMS}</title>`);
      const result = auditStructuralAlignment(page, NO_ENTITIES);
      const factor = findFactor(result, "Title Entity Alignment");
      expect(factor?.score).toBe(0);
      expect(factor?.status).toBe("neutral");
    });
  });

  describe("Meta Description Alignment", () => {
    it("awards the full 8 when the description covers every salient term", () => {
      const page = pageWith(metaTag(ALL_FIVE_TERMS));
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      const factor = findFactor(result, "Meta Description Alignment");
      expect(factor?.score).toBe(8);
      expect(factor?.maxScore).toBe(8);
    });

    it("awards 5 when the description covers two of the five salient terms", () => {
      const page = pageWith(metaTag(TWO_OF_FIVE_TERMS));
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      expect(findFactor(result, "Meta Description Alignment")?.score).toBe(5);
    });

    it("scores 0 without going neutral when the tag is missing", () => {
      const page = pageWith("");
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      const factor = findFactor(result, "Meta Description Alignment");
      expect(factor?.score).toBe(0);
      expect(factor?.status).toBe("critical");
      expect(factor?.value).toBe("No meta description present");
    });
  });

  describe("Heading Entity Alignment", () => {
    it("awards the full 10 when headings cover every salient term", () => {
      const page = pageWith("", `<h1>${ALL_FIVE_TERMS}</h1>${BODY}`);
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      const factor = findFactor(result, "Heading Entity Alignment");
      expect(factor?.score).toBe(10);
      expect(factor?.maxScore).toBe(10);
    });

    it("awards 3 when headings cover one of the five salient terms", () => {
      const page = pageWith("", `<h2>${ONE_OF_FIVE_TERMS}</h2>${BODY}`);
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      expect(findFactor(result, "Heading Entity Alignment")?.score).toBe(3);
    });

    it("scores 0 without going neutral when the page has no headings", () => {
      const page = pageWith("");
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      const factor = findFactor(result, "Heading Entity Alignment");
      expect(factor?.score).toBe(0);
      expect(factor?.value).toBe("No headings present");
    });
  });

  describe("Structured Data Alignment", () => {
    it("goes neutral when the JSON-LD carries no text fields", () => {
      const page = pageWith(
        jsonLdScript(`{"@type":"WebPage","url":"https://example.com/test"}`),
      );
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      const factor = findFactor(result, "Structured Data Alignment");
      expect(factor?.score).toBe(0);
      expect(factor?.status).toBe("neutral");
      expect(factor?.value).toBe("No JSON-LD text fields to align");
    });

    it("goes neutral when the page has no JSON-LD at all", () => {
      const page = pageWith("");
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      expect(findFactor(result, "Structured Data Alignment")?.status).toBe(
        "neutral",
      );
    });

    it("awards the full 6 when headline and description cover every salient term", () => {
      const page = pageWith(
        jsonLdScript(
          `{"@type":"Article","headline":"Acme Widgets solar energy battery storage","description":"grid infrastructure renewable power"}`,
        ),
      );
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      const factor = findFactor(result, "Structured Data Alignment");
      expect(factor?.score).toBe(6);
      expect(factor?.maxScore).toBe(6);
    });

    it("awards 4 when the headline covers two of the five salient terms", () => {
      const page = pageWith(
        jsonLdScript(`{"@type":"Article","headline":"${TWO_OF_FIVE_TERMS}"}`),
      );
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      expect(findFactor(result, "Structured Data Alignment")?.score).toBe(4);
    });
  });

  describe("category totals", () => {
    it("scores a fully aligned page at the category maximum of 36", () => {
      const head = [
        `<title>${ALL_FIVE_TERMS}</title>`,
        metaTag(ALL_FIVE_TERMS),
        jsonLdScript(
          `{"@type":"Article","headline":"Acme Widgets solar energy battery storage","description":"grid infrastructure renewable power"}`,
        ),
      ].join("");
      const page = pageWith(head, `<h1>${ALL_FIVE_TERMS}</h1>${BODY}`);
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      expect(result.category.score).toBe(36);
      expect(result.category.score).toBe(result.category.maxScore);
    });

    it("excludes the neutral structured data factor from the category maximum", () => {
      const head = [
        `<title>${ALL_FIVE_TERMS}</title>`,
        metaTag(ALL_FIVE_TERMS),
      ].join("");
      const page = pageWith(head, `<h1>${ALL_FIVE_TERMS}</h1>${BODY}`);
      const result = auditStructuralAlignment(page, BODY_ENTITIES);
      expect(findFactor(result, "Structured Data Alignment")?.status).toBe(
        "neutral",
      );
      expect(result.category.maxScore).toBe(30);
    });
  });
});
