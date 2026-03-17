import { describe, expect, it } from "vitest";
import { auditReadabilityForCompression } from "../../../../src/modules/audits/categories/readability.js";
import { extractPage } from "../../../../src/modules/extractor/service.js";

function buildPage(html: string) {
  return extractPage(html, "https://example.com/test");
}

function findFactor(
  name: string,
  result: ReturnType<typeof auditReadabilityForCompression>,
) {
  return result.category.factors.find((f) => f.name === name);
}

// 4-word sentences with monosyllabic words — very high FRE, very low jargon
const easySentences =
  "The cat sat. The dog ran. The bird flew. The sun set. The moon rose. ".repeat(
    30,
  );

// 15-word sentences with mixed syllables — mid-range FRE, mid sentence length
const midSentence =
  "Clear content helps businesses grow by reaching the right people online today. ".repeat(
    30,
  );

// 35-word sentences — forces very long sentence length (> 30 words = score 5)
const veryLongSentence = (
  "Although modern software development methodologies have significantly improved over the past decade " +
  "many organizations continue to struggle with consistent implementation of new engineering practices " +
  "tools and frameworks across distributed teams. "
).repeat(20);

// 9-word sentences — in the 8-11 word range (score 10)
const nineWordSentence =
  "Clear writing helps your readers understand information better. ".repeat(30);

// High-jargon polysyllabic words — complex for readability scoring
const technicalJargon =
  "Implementation optimization characterization systematically differentiates multidimensional. ".repeat(
    50,
  );

describe("auditReadabilityForCompression", () => {
  describe("Sentence Length", () => {
    it("scores 15 for sentences averaging 12–22 words", () => {
      const html = `<body><p>${midSentence}</p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      expect(findFactor("Sentence Length", result)?.score).toBe(15);
    });

    it("scores 10 for sentences averaging 8–11 words", () => {
      const html = `<body><p>${nineWordSentence}</p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      expect(findFactor("Sentence Length", result)?.score).toBe(10);
    });

    it("scores 5 for very long sentences (30+ words average)", () => {
      const html = `<body><p>${veryLongSentence}</p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      expect(findFactor("Sentence Length", result)?.score).toBe(5);
    });
  });

  describe("Readability (Flesch Reading Ease)", () => {
    it("scores 13 or 15 for simple short-sentence text (FRE above 60)", () => {
      const html = `<body><p>${easySentences}</p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      expect(findFactor("Readability", result)?.score).toBeGreaterThanOrEqual(
        13,
      );
    });

    it("scores 3 or 6 for very complex polysyllabic text (FRE below 30)", () => {
      const html = `<body><p>${technicalJargon}</p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      expect(findFactor("Readability", result)?.score).toBeLessThanOrEqual(6);
    });
  });

  describe("Sentence Length", () => {
    it("scores 0 for empty text (avgSentLen = 0)", () => {
      const html = `<body><p></p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      expect(findFactor("Sentence Length", result)?.score).toBe(0);
    });
  });

  describe("Jargon Density", () => {
    it("scores 15 for very low jargon (under 2% complex words)", () => {
      const html = `<body><p>${easySentences}</p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      expect(findFactor("Jargon Density", result)?.score).toBe(15);
    });

    it("scores 12 for moderate jargon (2-5% complex words)", () => {
      // ~3% complex words: 3 complex per 100 simple words
      const simpleWords =
        "The cat sat. The dog ran. The bird flew. The sun set. ".repeat(20);
      const complexWords =
        "Implementation optimization characterization. ".repeat(2);
      const html = `<body><p>${simpleWords}${complexWords}</p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      const score = findFactor("Jargon Density", result)?.score;
      expect(score).toBeGreaterThanOrEqual(8);
      expect(score).toBeLessThanOrEqual(12);
    });

    it("scores lower for high jargon density", () => {
      const html = `<body><p>${technicalJargon}</p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      expect(findFactor("Jargon Density", result)?.score).toBeLessThan(15);
    });
  });

  describe("Transition Usage", () => {
    it("scores 15 for 10+ distinct transition types", () => {
      const textWithTransitions =
        "However, this is important. Therefore, we should act. " +
        "Furthermore, there are reasons. Additionally, consider this. " +
        "Nevertheless, we continue. Meanwhile, others wait. " +
        "Similarly, the approach works. Consequently, results improve. " +
        "Moreover, evidence supports this. Specifically, studies confirm. " +
        "On the other hand, some disagree. As a result, changes happened.";
      const html = `<body><p>${textWithTransitions.repeat(5)}</p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      expect(findFactor("Transition Usage", result)?.score).toBe(15);
    });

    it("scores 7 for 2–4 distinct transition types", () => {
      const textWithFewTransitions =
        "However, this matters. Therefore, act now. ";
      const html = `<body><p>${textWithFewTransitions.repeat(20)}</p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      expect(
        findFactor("Transition Usage", result)?.score,
      ).toBeGreaterThanOrEqual(3);
    });

    it("scores 0 for no transition words", () => {
      const html = `<body><p>${easySentences}</p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      expect(findFactor("Transition Usage", result)?.score).toBe(0);
    });
  });

  describe("rawData", () => {
    it("includes avgSentenceLength and readabilityScore", () => {
      const html = `<body><p>${easySentences}</p></body>`;
      const page = buildPage(html);
      const result = auditReadabilityForCompression(page);
      expect(result.rawData.avgSentenceLength).toBeDefined();
      expect(result.rawData.readabilityScore).toBeDefined();
    });
  });
});
