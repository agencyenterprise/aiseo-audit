import { describe, expect, it } from "vitest";
import { auditGroundingSignals } from "../../../src/modules/grounding-signals/index.js";
import { extractPage } from "../../../src/modules/extractor/service.js";

function buildPage(html: string) {
  return extractPage(html, "https://example.com/test");
}

function findFactor(
  name: string,
  result: ReturnType<typeof auditGroundingSignals>,
) {
  return result.category.factors.find((f) => f.name === name);
}

describe("auditGroundingSignals", () => {
  describe("Numeric Claims", () => {
    it("scores for regex-detected numeric patterns", () => {
      const html = `<html><body>
        <p>The study found a 42% increase. Revenue grew by $1,200,000.
        Usage increased by 3 million users. Costs decreased by 15%.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);
      const factor = findFactor("Numeric Claims", result);

      expect(factor?.score).toBeGreaterThan(0);
    });

    it("scores for written-out numbers detected via NLP", () => {
      const html = `<html><body>
        <p>Five studies confirmed the results. Three companies participated.
        Two researchers reviewed the data. Seven experts agreed on the findings.
        Four metrics were tracked over six months.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);
      const factor = findFactor("Numeric Claims", result);

      expect(factor?.score).toBeGreaterThan(0);
    });

    it("factor value includes both statistical references and numeric values", () => {
      const html = `<html><body>
        <p>Five studies show a 42% improvement across three companies.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);
      const factor = findFactor("Numeric Claims", result);

      expect(factor?.value).toContain("statistical references");
      expect(factor?.value).toContain("numeric values");
    });

    it("scores zero for content with no numbers", () => {
      const html = `<html><body>
        <p>The cat sat on the mat. It was a nice day.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);
      const factor = findFactor("Numeric Claims", result);

      expect(factor?.score).toBe(0);
    });
  });

  describe("External References", () => {
    it("scores for external links", () => {
      const html = `<html><body>
        <p>See <a href="https://other-domain.com">this source</a> and
        <a href="https://another-site.org">this one</a> for more details.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);
      const factor = findFactor("External References", result);

      expect(factor?.score).toBeGreaterThan(0);
    });

    it("scores zero when no external links", () => {
      const html = `<html><body>
        <p>No links here at all.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);
      const factor = findFactor("External References", result);

      expect(factor?.score).toBe(0);
    });
  });

  describe("Citation Patterns", () => {
    it("scores for citation language", () => {
      const html = `<html><body>
        <p>According to research, this is true. Studies show the effect.
        Data from the report confirms it. As reported by the team.</p>
        <blockquote>A direct quote here.</blockquote>
      </body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);
      const factor = findFactor("Citation Patterns", result);

      expect(factor?.score).toBeGreaterThan(0);
    });
  });

  describe("category structure", () => {
    it("returns all expected factors", () => {
      const html = `<html><body><p>Some content.</p></body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);

      const factorNames = result.category.factors.map((f) => f.name);
      expect(factorNames).toContain("External References");
      expect(factorNames).toContain("Citation Patterns");
      expect(factorNames).toContain("Numeric Claims");
      expect(factorNames).toContain("Attribution Indicators");
      expect(factorNames).toContain("Quoted Attribution");
    });

    it("returns groundingSignals as category key", () => {
      const html = `<html><body><p>Content.</p></body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);

      expect(result.category.key).toBe("groundingSignals");
    });
  });
});
