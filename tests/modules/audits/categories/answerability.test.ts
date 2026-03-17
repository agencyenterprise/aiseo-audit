import { describe, expect, it } from "vitest";
import { auditAnswerability } from "../../../../src/modules/audits/categories/answerability.js";
import { extractPage } from "../../../../src/modules/extractor/service.js";

function buildPage(html: string) {
  return extractPage(html, "https://example.com/test");
}

function findFactor(
  name: string,
  result: ReturnType<typeof auditAnswerability>,
) {
  return result.category.factors.find((f) => f.name === name);
}

describe("auditAnswerability", () => {
  describe("Step-by-Step Content", () => {
    it("scores higher for instructional content with imperative verbs", () => {
      const html = `<html><body>
        <p>Install the package. Configure the settings. Open the dashboard.
        Click the button. Run the command. Save the file.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor("Step-by-Step Content", result);

      expect(factor?.score).toBeGreaterThan(0);
    });

    it("scores for ordered lists", () => {
      const html = `<html><body>
        <ol>
          <li>First step</li>
          <li>Second step</li>
          <li>Third step</li>
        </ol>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor("Step-by-Step Content", result);

      expect(factor?.score).toBeGreaterThan(0);
    });

    it("scores zero for non-instructional content with no steps", () => {
      const html = `<html><body>
        <p>The weather is nice today. She went to the market.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor("Step-by-Step Content", result);

      expect(factor?.score).toBe(0);
    });

    it("factor value includes instruction verb count", () => {
      const html = `<html><body>
        <p>Install the package. Configure the settings. Open the file.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor("Step-by-Step Content", result);

      expect(factor?.value).toContain("instruction verbs");
    });
  });

  describe("Definition Patterns", () => {
    it("scores for definition language", () => {
      const html = `<html><body>
        <p>GEO is defined as generative engine optimization. SEO refers to search engine optimization.
        AI means that machines can think. NLP is a type of machine learning.
        This can be described as intelligent automation. Also known as smart systems.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor("Definition Patterns", result);

      expect(factor?.score).toBeGreaterThan(0);
    });
  });

  describe("Q/A Patterns", () => {
    it("scores for questions in content", () => {
      const html = `<html><body>
        <h2>What is SEO?</h2><p>SEO is search engine optimization.</p>
        <h2>How do you optimize content?</h2><p>You write clearly.</p>
        <h2>Why is AI search different?</h2><p>It uses language models.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor("Q/A Patterns", result);

      expect(factor?.score).toBeGreaterThan(0);
    });
  });

  describe("Answer Capsules", () => {
    it("scores 13 when all question headings have answer capsules (ratio >= 0.7)", () => {
      const html = `<html><body>
        <h2>What is SEO?</h2><p>SEO is search engine optimization for websites.</p>
        <h2>How does AI work?</h2><p>AI uses neural networks and machine learning models.</p>
        <h2>Why is content important?</h2><p>Content helps users find information they need.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor("Answer Capsules", result);
      expect(factor?.score).toBe(13);
    });

    it("scores 9 when most question headings have capsules (ratio 0.4–0.69)", () => {
      const html = `<html><body>
        <h2>What is SEO?</h2><p>SEO is search engine optimization for websites.</p>
        <h2>How does AI work?</h2><p>AI uses neural networks and machine learning models.</p>
        <h2>Why matters?</h2><h3>Next section</h3>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor("Answer Capsules", result);
      expect(factor?.score).toBeGreaterThanOrEqual(5);
    });

    it("scores 2 when question headings have no capsule answers", () => {
      const html = `<html><body>
        <h2>What is SEO?</h2><h3>Next heading immediately</h3>
        <h2>How does AI work?</h2><h3>Another heading</h3>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor("Answer Capsules", result);
      expect(factor?.score).toBeLessThanOrEqual(9);
    });
  });

  describe("Summary/Conclusion", () => {
    it("scores 9 for two or more summary markers", () => {
      const html = `<html><body>
        <p>In summary, these are the key points. In conclusion, we have covered everything.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor("Summary/Conclusion", result);
      expect(factor?.score).toBe(9);
    });

    it("scores 5 for exactly one summary marker", () => {
      const html = `<html><body>
        <p>This is some content. In summary, here is one takeaway.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor("Summary/Conclusion", result);
      expect(factor?.score).toBe(5);
    });
  });

  describe("category structure", () => {
    it("returns all expected factors", () => {
      const html = `<html><body><p>Some content here.</p></body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);

      const factorNames = result.category.factors.map((f) => f.name);
      expect(factorNames).toContain("Definition Patterns");
      expect(factorNames).toContain("Direct Answer Statements");
      expect(factorNames).toContain("Answer Capsules");
      expect(factorNames).toContain("Step-by-Step Content");
      expect(factorNames).toContain("Q/A Patterns");
      expect(factorNames).toContain("Summary/Conclusion");
    });

    it("returns answerability as category key", () => {
      const html = `<html><body><p>Content.</p></body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);

      expect(result.category.key).toBe("answerability");
    });
  });
});
