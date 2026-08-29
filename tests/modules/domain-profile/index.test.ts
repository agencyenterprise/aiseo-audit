import { describe, expect, it } from "vitest";
import { detectDomain } from "../../../src/modules/domain-profile/index.js";
import { buildPage } from "../../helpers/page.js";

const productSchemaPage = buildPage(`
  <head>
    <script type="application/ld+json">
      {"@type":"Product","name":"Desk Lamp"}
    </script>
  </head>
  <body><h1>Desk Lamp</h1><p>A lamp for late nights.</p></body>
`);

const plainArticlePage = buildPage(`
  <body>
    <h1>The History of Desk Lighting</h1>
    <p>Oil lamps gave way to electric bulbs as homes changed.</p>
  </body>
`);

describe("detectDomain", () => {
  describe("auto detection", () => {
    it("detects product from Product JSON-LD", () => {
      expect(detectDomain(productSchemaPage, "auto")).toBe("product");
    });

    it("detects product from an og:type meta of product", () => {
      const page = buildPage(`
        <head><meta property="og:type" content="product"></head>
        <body><h1>Desk Lamp</h1><p>A lamp for late nights.</p></body>
      `);
      expect(detectDomain(page, "auto")).toBe("product");
    });

    it("detects product from repeated prices next to cart vocabulary", () => {
      const page = buildPage(`
        <body>
          <h1>Desk Lamp Shop</h1>
          <p>The classic lamp costs $19.99, the walnut lamp costs $24.99, and the brass lamp costs $29.99.</p>
          <p>Add to cart while every finish is in stock.</p>
        </body>
      `);
      expect(detectDomain(page, "auto")).toBe("product");
    });

    it("falls back to informational for a plain article page", () => {
      expect(detectDomain(plainArticlePage, "auto")).toBe("informational");
    });
  });

  describe("explicit override", () => {
    it("honors a requested informational domain on a Product schema page", () => {
      expect(detectDomain(productSchemaPage, "informational")).toBe(
        "informational",
      );
    });

    it("honors a requested product domain on a plain article page", () => {
      expect(detectDomain(plainArticlePage, "product")).toBe("product");
    });
  });
});
