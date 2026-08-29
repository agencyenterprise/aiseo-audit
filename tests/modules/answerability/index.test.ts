import { describe, expect, it } from "vitest";
import { auditAnswerability } from "../../../src/modules/answerability/index.js";
import { findFactor } from "../../helpers/factors.js";
import { buildPage } from "../../helpers/page.js";

describe("auditAnswerability", () => {
  describe("Step-by-Step Content", () => {
    it("scores higher for instructional content with imperative verbs", () => {
      const html = `<html><body>
        <p>Install the package. Configure the settings. Open the dashboard.
        Click the button. Run the command. Save the file.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor(result, "Step-by-Step Content");

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
      const factor = findFactor(result, "Step-by-Step Content");

      expect(factor?.score).toBeGreaterThan(0);
    });

    it("scores zero for non-instructional content with no steps", () => {
      const html = `<html><body>
        <p>The weather is nice today. She went to the market.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor(result, "Step-by-Step Content");

      expect(factor?.score).toBe(0);
    });

    it("factor value includes instruction verb count", () => {
      const html = `<html><body>
        <p>Install the package. Configure the settings. Open the file.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor(result, "Step-by-Step Content");

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
      const factor = findFactor(result, "Definition Patterns");

      expect(factor?.score).toBeGreaterThan(0);
    });
  });

  describe("Q/A Patterns diagnostic", () => {
    it("reports question counts as an unscored info diagnostic", () => {
      const html = `<html><body>
        <h2>What is SEO?</h2><p>SEO is search engine optimization.</p>
        <h2>How do you optimize content?</h2><p>You write clearly.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor(result, "Q/A Patterns");

      expect(factor?.status).toBe("info");
      expect(factor?.score).toBe(0);
      expect(factor?.maxScore).toBe(0);
      expect(factor?.value).toContain("query patterns");
    });
  });

  describe("Answer Capsules diagnostic", () => {
    it("reports the capsule ratio without scoring it", () => {
      const html = `<html><body>
        <h2>What is SEO?</h2><p>SEO is search engine optimization for websites.</p>
        <h2>How does AI work?</h2><h3>Next heading immediately</h3>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor(result, "Answer Capsules");

      expect(factor?.status).toBe("info");
      expect(factor?.maxScore).toBe(0);
      expect(factor?.value).toBe("1/2 question headings have answer capsules");
    });

    it("notes when no question-framed H2s exist", () => {
      const html = `<html><body><h2>Overview</h2><p>Plain prose.</p></body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor(result, "Answer Capsules");

      expect(factor?.status).toBe("info");
      expect(factor?.value).toBe("No question-framed H2s found");
    });
  });

  describe("Lead Summary", () => {
    it("scores 0 when the page buries its conclusion", () => {
      const html = `<html><body>
        <h1>Widgets</h1>
        <h2>Background</h2>
        <p>Short opener.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor(result, "Lead Summary");

      expect(factor?.score).toBe(0);
      expect(factor?.maxScore).toBe(13);
    });

    it("credits an explicit TL;DR marker in the lead", () => {
      const intro = "word ".repeat(40).trim();
      const html = `<html><body>
        <h1>Widgets</h1>
        <p>TL;DR: ${intro}</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor(result, "Lead Summary");

      expect(factor?.score).toBeGreaterThanOrEqual(10);
      expect(factor?.value).toContain("explicit summary marker");
    });
  });

  describe("Explanatory Depth", () => {
    it("scores 10 for six or more explanatory signals", () => {
      const html = `<html><body>
        <p>This happens because of rain. We stayed because of wind.
        He left because of snow. She smiled because of luck.
        It failed because of rust. It grew because of light.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor(result, "Explanatory Depth");

      expect(factor?.score).toBe(10);
      expect(factor?.maxScore).toBe(10);
    });

    it("scores 7 for three explanatory signals", () => {
      const html = `<html><body>
        <p>This happens because of rain. We stayed because of wind.
        He left because of snow.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      expect(findFactor(result, "Explanatory Depth")?.score).toBe(7);
    });

    it("scores 3 when a single how-framed heading is the only signal", () => {
      const html = `<html><body>
        <h2>How widgets are made</h2>
        <p>Plain prose with no causal language at all.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      expect(findFactor(result, "Explanatory Depth")?.score).toBe(3);
    });

    it("scores 0 for prose with no causal language or how/why headings", () => {
      const html = `<html><body><p>The sky is blue. The grass is green.</p></body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      expect(findFactor(result, "Explanatory Depth")?.score).toBe(0);
    });

    it("goes neutral for product pages where depth is not expected", () => {
      const html = `<html><body>
        <p>This happens because of rain. We stayed because of wind.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page, undefined, { domain: "product" });
      expect(findFactor(result, "Explanatory Depth")?.status).toBe("neutral");
    });
  });

  describe("Summary/Conclusion", () => {
    it("scores 9 for two or more summary markers", () => {
      const html = `<html><body>
        <p>In summary, these are the key points. In conclusion, we have covered everything.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor(result, "Summary/Conclusion");
      expect(factor?.score).toBe(9);
    });

    it("scores 5 for exactly one summary marker", () => {
      const html = `<html><body>
        <p>This is some content. In summary, here is one takeaway.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);
      const factor = findFactor(result, "Summary/Conclusion");
      expect(factor?.score).toBe(5);
    });
  });

  describe("category structure", () => {
    it("returns all expected factors", () => {
      const html = `<html><body><p>Some content here.</p></body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);

      const factorNames = result.category.factors.map((f) => f.name);
      expect(factorNames).toContain("Lead Summary");
      expect(factorNames).toContain("Definition Patterns");
      expect(factorNames).toContain("Direct Answer Statements");
      expect(factorNames).toContain("Answer Capsules");
      expect(factorNames).toContain("Step-by-Step Content");
      expect(factorNames).toContain("Q/A Patterns");
      expect(factorNames).toContain("Summary/Conclusion");
      expect(factorNames).toContain("Explanatory Depth");
    });

    it("excludes the two diagnostics from the category maxScore", () => {
      const html = `<html><body><p>Some content here.</p></body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);

      expect(result.category.maxScore).toBe(63);
    });

    it("returns answerability as category key", () => {
      const html = `<html><body><p>Content.</p></body></html>`;
      const page = buildPage(html);
      const result = auditAnswerability(page);

      expect(result.category.key).toBe("answerability");
    });
  });
});
