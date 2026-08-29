import { describe, expect, it } from "vitest";
import { auditGroundingSignals } from "../../../src/modules/grounding-signals/index.js";
import { findFactor } from "../../helpers/factors.js";
import { buildPage } from "../../helpers/page.js";

describe("auditGroundingSignals", () => {
  describe("Numeric Claims", () => {
    it("scores for regex-detected numeric patterns", () => {
      const html = `<html><body>
        <p>The study found a 42% increase. Revenue grew by $1,200,000.
        Usage increased by 3 million users. Costs decreased by 15%.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);
      const factor = findFactor(result, "Numeric Claims");

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
      const factor = findFactor(result, "Numeric Claims");

      expect(factor?.score).toBeGreaterThan(0);
    });

    it("factor value reports statistical references and written-out numbers", () => {
      const html = `<html><body>
        <p>Five studies show a 42% improvement across three companies.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);
      const factor = findFactor(result, "Numeric Claims");

      expect(factor?.value).toContain("statistical references");
      expect(factor?.value).toContain("written-out numbers");
    });

    it("does not double-count a digit statistic as both regex and NLP number", () => {
      const html = `<html><body>
        <p>Five studies show a 42% improvement across three companies.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);
      const factor = findFactor(result, "Numeric Claims");

      expect(factor?.value).toContain("1 statistical references");
      expect(factor?.value).toContain("2 written-out numbers");
    });

    it("scores zero for content with no numbers", () => {
      const html = `<html><body>
        <p>The cat sat on the mat. It was a nice day.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);
      const factor = findFactor(result, "Numeric Claims");

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
      const factor = findFactor(result, "External References");

      expect(factor?.score).toBeGreaterThan(0);
    });

    it("scores zero when no external links", () => {
      const html = `<html><body>
        <p>No links here at all.</p>
      </body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);
      const factor = findFactor(result, "External References");

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
      const factor = findFactor(result, "Citation Patterns");

      expect(factor?.score).toBeGreaterThan(0);
    });
  });

  describe("Hedged Language", () => {
    const confidentSentence = "The cat sat on the mat. ";

    it("scores the full 10 when hedging stays at or under 5% of sentences", () => {
      const text = `${confidentSentence.repeat(19)}This may vary.`;
      const result = auditGroundingSignals(
        buildPage(`<body><p>${text}</p></body>`),
      );
      const factor = findFactor(result, "Hedged Language");

      expect(factor?.score).toBe(10);
      expect(factor?.maxScore).toBe(10);
      expect(factor?.value).toContain("1 of 20 sentences hedge");
    });

    it("scores 6 when one in ten sentences hedges", () => {
      const text = `${confidentSentence.repeat(9)}This may vary.`;
      const result = auditGroundingSignals(
        buildPage(`<body><p>${text}</p></body>`),
      );
      expect(findFactor(result, "Hedged Language")?.score).toBe(6);
    });

    it("scores 3 when a fifth of the sentences hedge", () => {
      const text = `${confidentSentence.repeat(8)}This may vary. It could break.`;
      const result = auditGroundingSignals(
        buildPage(`<body><p>${text}</p></body>`),
      );
      expect(findFactor(result, "Hedged Language")?.score).toBe(3);
    });

    it("scores 0 when hedging dominates the prose", () => {
      const text = `${confidentSentence.repeat(4)}This may vary. It could break. Results might differ. Values may shift. Outcomes may change.`;
      const result = auditGroundingSignals(
        buildPage(`<body><p>${text}</p></body>`),
      );
      expect(findFactor(result, "Hedged Language")?.score).toBe(0);
    });

    it("stays neutral when the page has no sentences", () => {
      const result = auditGroundingSignals(buildPage("<body></body>"));
      const factor = findFactor(result, "Hedged Language");

      expect(factor?.status).toBe("neutral");
      expect(factor?.value).toBe("No sentences found");
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
      expect(factorNames).toContain("Hedged Language");
    });

    it("excludes the neutral quoted-attribution factor from maxScore on quiet pages", () => {
      const text = "The cat sat on the mat. ".repeat(5);
      const result = auditGroundingSignals(
        buildPage(`<body><p>${text}</p></body>`),
      );

      expect(result.category.maxScore).toBe(60);
    });

    it("returns groundingSignals as category key", () => {
      const html = `<html><body><p>Content.</p></body></html>`;
      const page = buildPage(html);
      const result = auditGroundingSignals(page);

      expect(result.category.key).toBe("groundingSignals");
    });
  });
});
