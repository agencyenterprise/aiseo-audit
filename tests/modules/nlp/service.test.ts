import { describe, expect, it } from "vitest";
import { DEFINITION_PATTERNS } from "../../../src/modules/audits/support/patterns.js";
import {
  avgSentenceLength,
  computeFleschReadingEase,
  countComplexWords,
  countPatternMatches,
  countTransitionWords,
  extractEntities,
} from "../../../src/modules/nlp/service.js";

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

  it("counts imperative verbs in instructional text", () => {
    const text =
      "Install the package. Configure the settings. Click the button and open the dashboard.";
    const entities = extractEntities(text);

    expect(entities.imperativeVerbCount).toBeDefined();
    expect(entities.imperativeVerbCount).toBeGreaterThan(0);
  });

  it("returns zero imperative verbs for non-instructional text", () => {
    const text = "The weather was nice. She walked to the store.";
    const entities = extractEntities(text);

    expect(entities.imperativeVerbCount).toBeDefined();
    expect(entities.imperativeVerbCount).toBe(0);
  });

  it("counts numeric values including written-out numbers", () => {
    const text =
      "There were five studies and three companies involved. Also 42 participants.";
    const entities = extractEntities(text);

    expect(entities.numberCount).toBeDefined();
    expect(entities.numberCount).toBeGreaterThan(0);
  });

  it("returns zero number count for text with no numbers", () => {
    const text = "The cat sat on the mat.";
    const entities = extractEntities(text);

    expect(entities.numberCount).toBeDefined();
    expect(entities.numberCount).toBe(0);
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
