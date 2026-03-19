import { describe, expect, it } from "vitest";
import { auditEntityClarity } from "../../../src/modules/entity-clarity/index.js";
import type { ExtractedEntitiesType } from "../../../src/modules/audits/schema.js";
import { extractPage } from "../../../src/modules/extractor/service.js";

function buildPage(html: string) {
  return extractPage(html, "https://example.com/test");
}

function findFactor(
  name: string,
  result: ReturnType<typeof auditEntityClarity>,
) {
  return result.category.factors.find((f) => f.name === name);
}

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

describe("auditEntityClarity", () => {
  describe("Entity Richness", () => {
    it("scores 20 for 9+ entities", () => {
      const entities = preExtracted({
        people: ["Alice", "Bob", "Carol"],
        organizations: ["Acme", "GlobalCorp", "TechInc"],
        places: ["New York", "London", "Tokyo"],
      });
      const page = buildPage(`<body><p>Content about AI SEO</p></body>`);
      const result = auditEntityClarity(page, entities);
      expect(findFactor("Entity Richness", result)?.score).toBe(20);
    });

    it("scores 14 for 4-8 entities", () => {
      const entities = preExtracted({
        people: ["Alice", "Bob"],
        organizations: ["Acme"],
        places: ["New York"],
        topics: ["SEO"],
      });
      const page = buildPage(`<body><p>Content</p></body>`);
      const result = auditEntityClarity(page, entities);
      expect(findFactor("Entity Richness", result)?.score).toBe(14);
    });

    it("scores 7 for 1-3 entities", () => {
      const entities = preExtracted({
        people: ["Alice"],
        organizations: ["Acme"],
      });
      const page = buildPage(`<body><p>Content</p></body>`);
      const result = auditEntityClarity(page, entities);
      expect(findFactor("Entity Richness", result)?.score).toBe(7);
    });

    it("scores 0 and is neutral for no entities", () => {
      const entities = preExtracted();
      const page = buildPage(`<body><p>Content</p></body>`);
      const result = auditEntityClarity(page, entities);
      const factor = findFactor("Entity Richness", result);
      expect(factor?.score).toBe(0);
      expect(factor?.status).toBe("neutral");
    });
  });

  describe("Topic Consistency", () => {
    it("scores 25 when 50%+ of title keywords match extracted topics", () => {
      // Title keywords (> 3 chars): "Content", "Marketing" -- both appear in topics list
      const entities = preExtracted({
        topics: ["content", "marketing", "strategy"],
      });
      const html = `<html><head><title>Content Marketing Guide</title></head><body><h1>Content Marketing</h1><p>About content marketing and strategy.</p></body></html>`;
      const page = buildPage(html);
      const result = auditEntityClarity(page, entities);
      expect(
        findFactor("Topic Consistency", result)?.score,
      ).toBeGreaterThanOrEqual(15);
    });

    it("scores 0 when no title keywords match topics", () => {
      const entities = preExtracted({
        topics: ["quantum physics", "astronomy"],
      });
      const html = `<html><head><title>Cooking Recipes Food Guide</title></head><body><h1>Cooking Recipes</h1><p>Some content about food.</p></body></html>`;
      const page = buildPage(html);
      const result = auditEntityClarity(page, entities);
      expect(
        findFactor("Topic Consistency", result)?.score,
      ).toBeLessThanOrEqual(15);
    });

    it("scores 0 and is neutral when page title has no keywords longer than 3 chars", () => {
      const entities = preExtracted({ topics: ["ai"] });
      const html = `<html><head><title>The Big</title></head><body><p>Content</p></body></html>`;
      const page = buildPage(html);
      const result = auditEntityClarity(page, entities);
      const factor = findFactor("Topic Consistency", result);
      expect(factor?.status).toBe("neutral");
    });
  });

  describe("Entity Density", () => {
    it("scores 15 for entity density in ideal range (2-8 per 100 words)", () => {
      const entities = preExtracted({
        people: ["Alice"],
        organizations: ["Acme", "GlobalCorp"],
        topics: ["SEO"],
      });
      const words = "word ".repeat(80).trim();
      const page = buildPage(`<body><p>${words}</p></body>`);
      const result = auditEntityClarity(page, entities);
      const factor = findFactor("Entity Density", result);
      expect(factor?.score).toBe(15);
    });

    it("scores 3 for very low entity density (below 1 per 100 words)", () => {
      const entities = preExtracted({ people: ["Alice"] });
      const words = "word ".repeat(500).trim();
      const page = buildPage(`<body><p>${words}</p></body>`);
      const result = auditEntityClarity(page, entities);
      expect(findFactor("Entity Density", result)?.score).toBe(3);
    });

    it("scores 10 for high entity density (above 8 per 100 words)", () => {
      const entities = preExtracted({
        people: ["Alice", "Bob", "Carol", "Dave"],
        organizations: ["Acme", "Corp"],
        places: ["NY", "LA"],
        topics: ["AI", "SEO"],
      });
      const words = "word ".repeat(10).trim();
      const page = buildPage(`<body><p>${words}</p></body>`);
      const result = auditEntityClarity(page, entities);
      expect(findFactor("Entity Density", result)?.score).toBe(10);
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
