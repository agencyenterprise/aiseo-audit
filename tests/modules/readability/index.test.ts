import { describe, expect, it } from "vitest";
import { auditReadabilityForCompression } from "../../../src/modules/readability/index.js";
import { findFactor } from "../../helpers/factors.js";
import { buildPage } from "../../helpers/page.js";

const fourWordMonosyllabicSentences =
  "The cat sat. The dog ran. The bird flew. The sun set. The moon rose. ".repeat(
    30,
  );

const fifteenWordMixedSyllableSentences =
  "Clear content helps businesses grow by reaching the right people online today. ".repeat(
    30,
  );

const fortyFiveWordRunOnSentences = `${"word ".repeat(45).trim()}. `.repeat(10);

const polysyllabicJargon =
  "Implementation optimization characterization systematically differentiates multidimensional. ".repeat(
    50,
  );

const mostlyJargonSentences =
  "Implementation optimization characterization differentiates the plan. ".repeat(
    20,
  );

describe("auditReadabilityForCompression", () => {
  describe("Sentence Length floor", () => {
    it("scores the full 10 for sentences averaging under the 35-word floor", () => {
      const html = `<body><p>${fifteenWordMixedSyllableSentences}</p></body>`;
      const result = auditReadabilityForCompression(buildPage(html));
      const factor = findFactor(result, "Sentence Length");
      expect(factor?.score).toBe(10);
      expect(factor?.maxScore).toBe(10);
    });

    it("scores 0 for run-on sentences averaging above 35 words", () => {
      const html = `<body><p>${fortyFiveWordRunOnSentences}</p></body>`;
      const result = auditReadabilityForCompression(buildPage(html));
      const factor = findFactor(result, "Sentence Length");
      expect(factor?.score).toBe(0);
      expect(factor?.value).toContain("above the 35-word floor");
    });

    it("passes the floor for empty text where the average is zero", () => {
      const html = `<body><p></p></body>`;
      const result = auditReadabilityForCompression(buildPage(html));
      expect(findFactor(result, "Sentence Length")?.score).toBe(10);
    });
  });

  describe("Readability floor", () => {
    it("scores the full 10 for simple short-sentence text well above Flesch 30", () => {
      const html = `<body><p>${fourWordMonosyllabicSentences}</p></body>`;
      const result = auditReadabilityForCompression(buildPage(html));
      const factor = findFactor(result, "Readability");
      expect(factor?.score).toBe(10);
      expect(factor?.maxScore).toBe(10);
    });

    it("scores 0 for dense polysyllabic text below Flesch 30", () => {
      const html = `<body><p>${polysyllabicJargon}</p></body>`;
      const result = auditReadabilityForCompression(buildPage(html));
      const factor = findFactor(result, "Readability");
      expect(factor?.score).toBe(0);
      expect(factor?.value).toContain("below the 30-point floor");
    });
  });

  describe("Jargon Density ceiling", () => {
    it("scores the full 10 for plain monosyllabic prose", () => {
      const html = `<body><p>${fourWordMonosyllabicSentences}</p></body>`;
      const result = auditReadabilityForCompression(buildPage(html));
      const factor = findFactor(result, "Jargon Density");
      expect(factor?.score).toBe(10);
      expect(factor?.maxScore).toBe(10);
    });

    it("scores 0 when complex words exceed the 10% ceiling", () => {
      const html = `<body><p>${mostlyJargonSentences}</p></body>`;
      const result = auditReadabilityForCompression(buildPage(html));
      const factor = findFactor(result, "Jargon Density");
      expect(factor?.score).toBe(0);
      expect(factor?.value).toContain("above the 10% ceiling");
    });
  });

  describe("Transition Usage diagnostic", () => {
    it("reports transition variety as an unscored info diagnostic", () => {
      const textWithTransitions =
        "However, this is important. Therefore, we should act. " +
        "Furthermore, there are reasons. Additionally, consider this.";
      const html = `<body><p>${textWithTransitions}</p></body>`;
      const result = auditReadabilityForCompression(buildPage(html));
      const factor = findFactor(result, "Transition Usage");
      expect(factor?.status).toBe("info");
      expect(factor?.score).toBe(0);
      expect(factor?.maxScore).toBe(0);
      expect(factor?.value).toContain("transition types found");
    });
  });

  describe("category scoring", () => {
    it("sums only the three floor factors for a 30-point category max", () => {
      const html = `<body><p>${fifteenWordMixedSyllableSentences}</p></body>`;
      const result = auditReadabilityForCompression(buildPage(html));
      expect(result.category.maxScore).toBe(30);
      expect(result.category.score).toBe(30);
    });
  });

  describe("rawData", () => {
    it("includes avgSentenceLength and readabilityScore", () => {
      const html = `<body><p>${fourWordMonosyllabicSentences}</p></body>`;
      const result = auditReadabilityForCompression(buildPage(html));
      expect(result.rawData.avgSentenceLength).toBeDefined();
      expect(result.rawData.readabilityScore).toBeDefined();
    });
  });
});
