import { describe, expect, it } from "vitest";
import { auditProductFit } from "../../../src/modules/product-fit/index.js";
import { findFactor } from "../../helpers/factors.js";
import { buildPage } from "../../helpers/page.js";

describe("auditProductFit", () => {
  describe("Price Presence", () => {
    it("scores 15 via json-ld when a Product offer carries a price", () => {
      const html = `
        <head>
          <script type="application/ld+json">
            {"@type":"Product","name":"Desk Lamp","offers":{"price":"49.99"}}
          </script>
        </head>
        <body><h1>Desk Lamp</h1><p>A lamp for late nights.</p></body>
      `;
      const result = auditProductFit(buildPage(html));
      const factor = findFactor(result, "Price Presence");
      expect(factor?.score).toBe(15);
      expect(factor?.value).toContain("json-ld");
    });

    it("scores 15 via visible text when a dollar price appears in the body", () => {
      const html = `<body><h1>Desk Lamp</h1><p>The lamp costs $49.99 with free delivery.</p></body>`;
      const result = auditProductFit(buildPage(html));
      const factor = findFactor(result, "Price Presence");
      expect(factor?.score).toBe(15);
      expect(factor?.value).toContain("visible-text");
    });

    it("scores 0 when the page never states a price", () => {
      const html = `<body><h1>Desk Lamp</h1><p>A lamp for late nights.</p></body>`;
      const result = auditProductFit(buildPage(html));
      expect(findFactor(result, "Price Presence")?.score).toBe(0);
    });
  });

  describe("Technical Specifications", () => {
    it("scores 10 when spec rows, definition pairs, and a labeled bullet add up to six signals", () => {
      const html = `
        <body>
          <h1>Desk Lamp</h1>
          <table>
            <tr><td>Height</td><td>40 cm</td></tr>
            <tr><td>Cable length</td><td>150 cm</td></tr>
            <tr><td>Bulbs included</td><td>3</td></tr>
          </table>
          <dl>
            <dt>Finish</dt><dd>Matte black</dd>
            <dt>Mount</dt><dd>Clamp base</dd>
          </dl>
          <ul><li>Weight: nine hundred grams</li></ul>
        </body>
      `;
      const result = auditProductFit(buildPage(html));
      expect(findFactor(result, "Technical Specifications")?.score).toBe(10);
    });

    it("scores 7 when three labeled bullets are the only spec signals", () => {
      const html = `
        <body>
          <h1>Desk Lamp</h1>
          <ul>
            <li>Weight: nine hundred grams</li>
            <li>Material: brushed aluminum shade</li>
            <li>Color: matte black finish</li>
          </ul>
        </body>
      `;
      const result = auditProductFit(buildPage(html));
      expect(findFactor(result, "Technical Specifications")?.score).toBe(7);
    });

    it("scores 3 when a lone model number is the only spec signal", () => {
      const html = `<body><h1>Desk Lamp</h1><p>The lamp ships as model DL-200 in one box.</p></body>`;
      const result = auditProductFit(buildPage(html));
      expect(findFactor(result, "Technical Specifications")?.score).toBe(3);
    });

    it("caps model numbers at five so seven variants still score 7", () => {
      const html = `<body><h1>Desk Lamp</h1><p>Variants DL-200 DL-201 DL-202 DL-203 DL-204 DL-205 DL-206 exist.</p></body>`;
      const result = auditProductFit(buildPage(html));
      expect(findFactor(result, "Technical Specifications")?.score).toBe(7);
    });

    it("scores 0 when the page offers no specification signals", () => {
      const html = `<body><h1>Desk Lamp</h1><p>A lamp for late nights.</p></body>`;
      const result = auditProductFit(buildPage(html));
      expect(findFactor(result, "Technical Specifications")?.score).toBe(0);
    });
  });

  describe("Comparison Content", () => {
    it("scores 8 when a vs table counts double alongside three comparison phrases", () => {
      const html = `
        <body>
          <h1>Desk Lamp Face-Off</h1>
          <table>
            <tr><th>Lamp A vs Lamp B</th></tr>
            <tr><td>Brightness</td><td>Softness</td></tr>
          </table>
          <p>Lamp A compared to Lamp B feels sturdier, and it is better than most rivals.</p>
        </body>
      `;
      const result = auditProductFit(buildPage(html));
      expect(findFactor(result, "Comparison Content")?.score).toBe(8);
    });

    it("scores 5 when exactly two comparison phrases appear", () => {
      const html = `<body><h1>Desk Lamp</h1><p>This lamp compared with older models shines brighter, and alternatives to it cost more.</p></body>`;
      const result = auditProductFit(buildPage(html));
      expect(findFactor(result, "Comparison Content")?.score).toBe(5);
    });

    it("scores 2 when a single vs mention is the only comparison signal", () => {
      const html = `<body><h1>Desk Lamp</h1><p>The eternal debate of warm vs cool lighting continues.</p></body>`;
      const result = auditProductFit(buildPage(html));
      expect(findFactor(result, "Comparison Content")?.score).toBe(2);
    });

    it("scores 0 when the page never compares anything", () => {
      const html = `<body><h1>Desk Lamp</h1><p>A lamp for late nights.</p></body>`;
      const result = auditProductFit(buildPage(html));
      expect(findFactor(result, "Comparison Content")?.score).toBe(0);
    });
  });
});
