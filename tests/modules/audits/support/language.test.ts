import { describe, expect, it } from "vitest";
import {
  avgSentenceLength,
  computeFleschReadingEase,
  countComplexWords,
  countPatternMatches,
  countTransitionWords,
  extractEntities,
} from "../../../../src/modules/audits/support/nlp.js";
import { DEFINITION_PATTERNS } from "../../../../src/modules/audits/support/patterns.js";
import { checkCrawlerAccess } from "../../../../src/modules/audits/support/robots.js";
import { evaluateSchemaCompleteness } from "../../../../src/modules/audits/support/schema-analysis.js";

describe("extractEntities", () => {
  it("extracts people from text", () => {
    const text =
      "John Smith and Jane Doe discussed the project with Dr. Michael Chen.";
    const entities = extractEntities(text);

    expect(entities.people.length).toBeGreaterThan(0);
  });

  it("extracts organizations from text", () => {
    const text = "Google and Microsoft announced a partnership with OpenAI.";
    const entities = extractEntities(text);

    expect(entities.organizations.length).toBeGreaterThan(0);
  });

  it("extracts places from text", () => {
    const text = "The conference was held in New York and San Francisco.";
    const entities = extractEntities(text);

    expect(entities.places.length).toBeGreaterThan(0);
  });

  it("limits results to prevent overflow", () => {
    const text = Array(20).fill("Person One Person Two").join(". ");
    const entities = extractEntities(text);

    expect(entities.people.length).toBeLessThanOrEqual(10);
    expect(entities.organizations.length).toBeLessThanOrEqual(10);
    expect(entities.places.length).toBeLessThanOrEqual(10);
    expect(entities.topics.length).toBeLessThanOrEqual(15);
  });
});

describe("computeFleschReadingEase", () => {
  it("returns higher score for simple text", () => {
    const simpleText =
      "The cat sat on the mat. It was a nice day. The sun was warm.";
    const score = computeFleschReadingEase(simpleText);

    expect(score).toBeGreaterThan(60);
  });

  it("returns lower score for complex text", () => {
    const complexText =
      "The implementation of sophisticated methodologies necessitates comprehensive understanding of multifaceted paradigms. Consequently, organizations must judiciously evaluate their strategic objectives.";
    const score = computeFleschReadingEase(complexText);

    expect(score).toBeLessThan(40);
  });

  it("returns 0 for empty text", () => {
    expect(computeFleschReadingEase("")).toBe(0);
  });
});

describe("countComplexWords", () => {
  it("counts words with 4+ syllables", () => {
    const text =
      "The implementation of sophisticated methodologies is necessary.";
    const count = countComplexWords(text);

    expect(count).toBeGreaterThan(0);
  });

  it("returns 0 for simple text", () => {
    const text = "The cat sat on the mat.";
    const count = countComplexWords(text);

    expect(count).toBe(0);
  });
});

describe("countPatternMatches", () => {
  it("counts pattern matches in text", () => {
    const text =
      "GEO is defined as optimization. It refers to making sites better.";
    const count = countPatternMatches(text, DEFINITION_PATTERNS);

    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("returns 0 when no matches", () => {
    const text = "Hello world.";
    const count = countPatternMatches(text, DEFINITION_PATTERNS);

    expect(count).toBe(0);
  });
});

describe("countTransitionWords", () => {
  it("counts transition words in text", () => {
    const text =
      "However, this is true. Furthermore, it matters. Therefore, we proceed.";
    const words = ["however", "furthermore", "therefore", "additionally"];
    const count = countTransitionWords(text, words);

    expect(count).toBe(3);
  });

  it("is case insensitive", () => {
    const text = "HOWEVER this is FURTHERMORE important.";
    const words = ["however", "furthermore"];
    const count = countTransitionWords(text, words);

    expect(count).toBe(2);
  });

  it("returns 0 when no matches", () => {
    const text = "Hello world.";
    const words = ["however", "therefore"];
    const count = countTransitionWords(text, words);

    expect(count).toBe(0);
  });
});

describe("avgSentenceLength", () => {
  it("calculates average sentence length", () => {
    const text = "This is a sentence. Here is another one. And one more here.";
    const avg = avgSentenceLength(text);

    expect(avg).toBeGreaterThan(0);
    expect(avg).toBeLessThan(10);
  });

  it("returns 0 for empty text", () => {
    expect(avgSentenceLength("")).toBe(0);
  });
});

describe("checkCrawlerAccess", () => {
  it("returns all unknown when no robots.txt", () => {
    const result = checkCrawlerAccess(null);

    expect(result.unknown.length).toBeGreaterThan(0);
    expect(result.allowed.length).toBe(0);
    expect(result.blocked.length).toBe(0);
  });

  it("detects blocked crawlers", () => {
    const robotsTxt = `
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.blocked).toContain("GPTBot");
    expect(result.blocked).toContain("ClaudeBot");
  });

  it("detects allowed crawlers via wildcard", () => {
    const robotsTxt = `
User-agent: *
Allow: /
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.blocked.length).toBe(0);
  });

  it("detects wildcard blocking", () => {
    const robotsTxt = `
User-agent: *
Disallow: /
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.blocked.length).toBeGreaterThan(0);
  });
});

describe("evaluateSchemaCompleteness", () => {
  it("evaluates Article schema completeness", () => {
    const schemas = [
      {
        "@type": "Article",
        headline: "Test Article",
        author: { "@type": "Person", name: "John" },
        datePublished: "2026-01-01",
      },
    ];

    const result = evaluateSchemaCompleteness(schemas);

    expect(result.totalTypes).toBe(1);
    expect(result.avgCompleteness).toBe(1);
    expect(result.details[0].missing.length).toBe(0);
  });

  it("identifies missing properties", () => {
    const schemas = [
      {
        "@type": "Article",
        headline: "Test Article",
      },
    ];

    const result = evaluateSchemaCompleteness(schemas);

    expect(result.totalTypes).toBe(1);
    expect(result.avgCompleteness).toBeLessThan(1);
    expect(result.details[0].missing).toContain("author");
    expect(result.details[0].missing).toContain("datePublished");
  });

  it("ignores unknown schema types", () => {
    const schemas = [
      {
        "@type": "UnknownType",
        foo: "bar",
      },
    ];

    const result = evaluateSchemaCompleteness(schemas);

    expect(result.totalTypes).toBe(0);
  });

  it("handles multiple schemas", () => {
    const schemas = [
      {
        "@type": "Article",
        headline: "Test",
        author: "John",
        datePublished: "2026-01-01",
      },
      {
        "@type": "Organization",
        name: "TechCorp",
        url: "https://example.com",
      },
    ];

    const result = evaluateSchemaCompleteness(schemas);

    expect(result.totalTypes).toBe(2);
    expect(result.avgCompleteness).toBe(1);
  });

  it("handles empty array", () => {
    const result = evaluateSchemaCompleteness([]);

    expect(result.totalTypes).toBe(0);
    expect(result.avgCompleteness).toBe(0);
  });
});
