import { describe, expect, it } from "vitest";
import { auditQueryAlignment } from "../../../src/modules/query-alignment/index.js";
import { findFactor } from "../../helpers/factors.js";
import { buildPage } from "../../helpers/page.js";

const wellServedPage = buildPage(`
  <head><title>Ergonomic Keyboard Review</title></head>
  <body>
    <h1>Ergonomic Keyboard Review</h1>
    <p>This ergonomic keyboard review covers comfort and typing feel.</p>
  </body>
`);

const partiallyServedPage = buildPage(`
  <head><title>Ergonomic Keyboard Review</title></head>
  <body>
    <h1>Ergonomic Keyboard Review</h1>
    <p>This ergonomic keyboard review rates typing comfort.</p>
    <h2>Mechanical Feel</h2>
    <p>The mechanical feel is crisp.</p>
  </body>
`);

describe("auditQueryAlignment", () => {
  describe("Query Term Coverage", () => {
    it("scores 15 on both surfaces when the only query is fully covered in title, headings, and body", () => {
      const result = auditQueryAlignment(wellServedPage, [
        "ergonomic keyboard review",
      ]);
      expect(
        findFactor(result, "Query Term Coverage (Structural)")?.score,
      ).toBe(15);
      expect(findFactor(result, "Query Term Coverage (Body)")?.score).toBe(15);
    });

    it("drops both surfaces to 5 when the weakest of two queries has only 1 of 3 terms on the page", () => {
      const result = auditQueryAlignment(partiallyServedPage, [
        "ergonomic keyboard review",
        "mechanical switch durability",
      ]);
      expect(
        findFactor(result, "Query Term Coverage (Structural)")?.score,
      ).toBe(5);
      expect(findFactor(result, "Query Term Coverage (Body)")?.score).toBe(5);
    });

    it("scores 9 on both surfaces when the weakest query covers half of its terms", () => {
      const result = auditQueryAlignment(partiallyServedPage, [
        "ergonomic keyboard review",
        "mechanical switch",
      ]);
      expect(
        findFactor(result, "Query Term Coverage (Structural)")?.score,
      ).toBe(9);
      expect(findFactor(result, "Query Term Coverage (Body)")?.score).toBe(9);
    });

    it("scores 0 on both surfaces when one query shares no terms with the page", () => {
      const result = auditQueryAlignment(wellServedPage, [
        "ergonomic keyboard review",
        "quantum trampoline physics",
      ]);
      expect(
        findFactor(result, "Query Term Coverage (Structural)")?.score,
      ).toBe(0);
      expect(findFactor(result, "Query Term Coverage (Body)")?.score).toBe(0);
    });

    it("names the weakest query and reports how many queries were adequately served", () => {
      const result = auditQueryAlignment(partiallyServedPage, [
        "ergonomic keyboard review",
        "mechanical switch durability",
      ]);
      const structural = findFactor(result, "Query Term Coverage (Structural)");
      const body = findFactor(result, "Query Term Coverage (Body)");
      expect(structural?.value).toContain('"mechanical switch durability"');
      expect(structural?.value).toContain("1 of 2 queries adequately served");
      expect(body?.value).toContain('"mechanical switch durability"');
      expect(body?.value).toContain("1 of 2 queries adequately served");
    });

    it("reports the single query as adequately served when it hits every term", () => {
      const result = auditQueryAlignment(wellServedPage, [
        "ergonomic keyboard review",
      ]);
      const structural = findFactor(result, "Query Term Coverage (Structural)");
      expect(structural?.value).toContain("1 of 1 queries adequately served");
    });
  });

  describe("Query Aspect Coverage", () => {
    it("scores 10 when every query aspect gets its own dedicated section", () => {
      const page = buildPage(`
        <body>
          <h1>Wireless Keyboard Buying Guide</h1>
          <p>Everything shoppers ask before choosing a wireless model.</p>
          <h2>Battery</h2>
          <p>The battery lasts three weeks and the battery recharges over USB-C.</p>
          <h2>Warranty</h2>
          <p>The warranty runs two years and warranty claims resolve fast.</p>
          <h2>Shipping</h2>
          <p>Standard shipping takes two days and express shipping costs extra.</p>
        </body>
      `);
      const result = auditQueryAlignment(page, ["battery warranty shipping"]);
      const factor = findFactor(result, "Query Aspect Coverage");
      expect(factor?.score).toBe(10);
      expect(factor?.value).toContain("3 of 3 aspects");
    });

    it("scores 6 when two of three aspects have dedicated sections", () => {
      const page = buildPage(`
        <body>
          <h1>Wireless Keyboard Buying Guide</h1>
          <p>Everything shoppers ask before choosing a wireless model.</p>
          <h2>Battery</h2>
          <p>The battery lasts three weeks and the battery recharges over USB-C.</p>
          <h2>Warranty</h2>
          <p>The warranty runs two years and warranty claims resolve fast.</p>
        </body>
      `);
      const result = auditQueryAlignment(page, ["battery warranty shipping"]);
      const factor = findFactor(result, "Query Aspect Coverage");
      expect(factor?.score).toBe(6);
      expect(factor?.value).toContain("2 of 3 aspects");
    });

    it("scores 0 when no section addresses any aspect of the query", () => {
      const page = buildPage(`
        <body>
          <h1>Wireless Keyboard Buying Guide</h1>
          <h2>Design</h2>
          <p>The frame is aluminum and the layout stays compact.</p>
          <h2>Typing Feel</h2>
          <p>Keys respond with quiet travel.</p>
        </body>
      `);
      const result = auditQueryAlignment(page, ["battery warranty shipping"]);
      const factor = findFactor(result, "Query Aspect Coverage");
      expect(factor?.score).toBe(0);
      expect(factor?.value).toContain("0 of 3 aspects");
    });
  });
});
