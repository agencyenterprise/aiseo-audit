import { describe, expect, it } from "vitest";
import { auditEntityClarity } from "../../../src/modules/entity-clarity/index.js";
import type { ExtractedEntitiesType } from "../../../src/modules/audits/schema.js";
import { findFactor } from "../../helpers/factors.js";
import { buildPage } from "../../helpers/page.js";

function preExtracted(
  overrides: Partial<ExtractedEntitiesType> = {},
): ExtractedEntitiesType {
  return {
    people: [],
    organizations: [],
    places: [],
    topics: [],
    ...overrides,
  };
}

function pageRepeatingTerm(termOccurrences: number, fillerWords: number) {
  const text =
    `${"Acme ".repeat(termOccurrences)}${"word ".repeat(fillerWords)}`.trim();
  return buildPage(`<body><p>${text}</p></body>`);
}

describe("auditEntityClarity", () => {
  describe("Entity Richness", () => {
    it("scores 12 for 9+ named entities", () => {
      const entities = preExtracted({
        people: ["Alice", "Bob", "Carol"],
        organizations: ["Acme", "GlobalCorp", "TechInc"],
        places: ["New York", "London", "Tokyo"],
      });
      const page = buildPage(`<body><p>Content about AI SEO</p></body>`);
      const result = auditEntityClarity(page, entities);
      const factor = findFactor(result, "Entity Richness");
      expect(factor?.score).toBe(12);
      expect(factor?.maxScore).toBe(12);
    });

    it("scores 8 for 4-8 named entities", () => {
      const entities = preExtracted({
        people: ["Alice", "Bob"],
        organizations: ["Acme"],
        places: ["New York"],
      });
      const page = buildPage(`<body><p>Content</p></body>`);
      const result = auditEntityClarity(page, entities);
      expect(findFactor(result, "Entity Richness")?.score).toBe(8);
    });

    it("scores 4 for 1-3 named entities", () => {
      const entities = preExtracted({
        people: ["Alice"],
        organizations: ["Acme"],
      });
      const page = buildPage(`<body><p>Content</p></body>`);
      const result = auditEntityClarity(page, entities);
      expect(findFactor(result, "Entity Richness")?.score).toBe(4);
    });

    it("scores 0 and is neutral for no named entities", () => {
      const entities = preExtracted();
      const page = buildPage(`<body><p>Content</p></body>`);
      const result = auditEntityClarity(page, entities);
      const factor = findFactor(result, "Entity Richness");
      expect(factor?.score).toBe(0);
      expect(factor?.status).toBe("neutral");
    });
  });

  describe("Topic Consistency", () => {
    it("scores 18 when at least half the title keywords align with topics", () => {
      const entities = preExtracted({
        topics: ["content", "marketing", "guide"],
      });
      const html = `<html><head><title>Content Marketing Guide</title></head><body><h1>Content Marketing</h1><p>About strategy.</p></body></html>`;
      const result = auditEntityClarity(buildPage(html), entities);
      const factor = findFactor(result, "Topic Consistency");
      expect(factor?.score).toBe(18);
      expect(factor?.maxScore).toBe(18);
    });

    it("scores 11 when only a sliver of title keywords align", () => {
      const entities = preExtracted({ topics: ["content"] });
      const html = `<html><head><title>Content Marketing Guide</title></head><body><p>About one thing.</p></body></html>`;
      const result = auditEntityClarity(buildPage(html), entities);
      expect(findFactor(result, "Topic Consistency")?.score).toBe(11);
    });

    it("scores 0 when no title keywords match topics or repeat in the body", () => {
      const entities = preExtracted({
        topics: ["quantum physics", "astronomy"],
      });
      const html = `<html><head><title>Cooking Recipes Food Guide</title></head><body><h1>Cooking Recipes</h1><p>Some content about food.</p></body></html>`;
      const result = auditEntityClarity(buildPage(html), entities);
      expect(findFactor(result, "Topic Consistency")?.score).toBe(0);
    });

    it("is neutral when the page title has no keywords longer than 3 chars", () => {
      const entities = preExtracted({ topics: ["ai"] });
      const html = `<html><head><title>The Big</title></head><body><p>Content</p></body></html>`;
      const result = auditEntityClarity(buildPage(html), entities);
      expect(findFactor(result, "Topic Consistency")?.status).toBe("neutral");
    });
  });

  describe("Term Repetition Balance", () => {
    it("scores 8 when the leading term stays at or under 2.5% of the text", () => {
      const entities = preExtracted({ organizations: ["Acme"] });
      const result = auditEntityClarity(pageRepeatingTerm(8, 392), entities);
      const factor = findFactor(result, "Term Repetition Balance");
      expect(factor?.score).toBe(8);
      expect(factor?.maxScore).toBe(8);
    });

    it("scores 4 when the leading term creeps toward over-optimization at 3%", () => {
      const entities = preExtracted({ organizations: ["Acme"] });
      const result = auditEntityClarity(pageRepeatingTerm(12, 388), entities);
      const factor = findFactor(result, "Term Repetition Balance");
      expect(factor?.score).toBe(4);
      expect(factor?.value).toContain("approaching over-optimization");
    });

    it("scores 0 when the leading term saturates 5% of the text", () => {
      const entities = preExtracted({ organizations: ["Acme"] });
      const result = auditEntityClarity(pageRepeatingTerm(20, 380), entities);
      expect(findFactor(result, "Term Repetition Balance")?.score).toBe(0);
    });

    it("is neutral when there are no salient terms to measure", () => {
      const entities = preExtracted();
      const page = buildPage(
        `<body><p>${"word ".repeat(50).trim()}</p></body>`,
      );
      const result = auditEntityClarity(page, entities);
      const factor = findFactor(result, "Term Repetition Balance");
      expect(factor?.status).toBe("neutral");
      expect(factor?.value).toBe("No salient terms to measure");
    });
  });

  describe("Pronoun Ambiguity diagnostic", () => {
    it("reports pronoun-opening paragraphs as an unscored info diagnostic", () => {
      const substantial = "word ".repeat(30).trim();
      const html = `<body><p>It ${substantial}</p><p>Acme ${substantial}</p></body>`;
      const result = auditEntityClarity(buildPage(html), preExtracted());
      const factor = findFactor(result, "Pronoun Ambiguity");
      expect(factor?.status).toBe("info");
      expect(factor?.score).toBe(0);
      expect(factor?.maxScore).toBe(0);
      expect(factor?.value).toContain(
        "1 of 2 substantial paragraphs open with a pronoun subject",
      );
    });

    it("is excluded from the category maxScore along with neutral factors", () => {
      const entities = preExtracted({ organizations: ["Acme"] });
      const result = auditEntityClarity(pageRepeatingTerm(8, 392), entities);
      expect(result.category.maxScore).toBe(20);
    });
  });

  describe("rawData", () => {
    it("includes extracted entities in rawData", () => {
      const entities = preExtracted({
        people: ["Alice"],
        organizations: ["Acme"],
      });
      const page = buildPage(`<body><p>Content</p></body>`);
      const result = auditEntityClarity(page, entities);
      expect(result.rawData.entities?.people).toContain("Alice");
      expect(result.rawData.entities?.organizations).toContain("Acme");
    });
  });
});
