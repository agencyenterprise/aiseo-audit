import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import {
  parseJsonLdObjects,
  schemaTypesOf,
} from "../../../src/modules/extractor/json-ld.js";
import { evaluateSchemaCompleteness } from "../../../src/modules/authority-context/schema-analysis.js";

describe("parseJsonLdObjects", () => {
  const wrap = (json: string) =>
    cheerio.load(
      `<html><head><script type="application/ld+json">${json}</script></head><body></body></html>`,
    );

  it("flattens Yoast-style @graph envelopes", () => {
    const $ = wrap(
      JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Article", headline: "Post" },
          { "@type": "Organization", name: "TechCorp" },
        ],
      }),
    );

    const objects = parseJsonLdObjects($);
    const types = objects.flatMap(schemaTypesOf);

    expect(types).toContain("Article");
    expect(types).toContain("Organization");
  });

  it("flattens top-level arrays", () => {
    const $ = wrap(
      JSON.stringify([
        { "@type": "WebPage", name: "Home" },
        { "@type": "FAQPage", mainEntity: [] },
      ]),
    );

    const types = parseJsonLdObjects($).flatMap(schemaTypesOf);
    expect(types).toEqual(["WebPage", "FAQPage"]);
  });

  it("skips malformed JSON without failing", () => {
    const $ = wrap("{ not valid json");
    expect(parseJsonLdObjects($)).toEqual([]);
  });
});

describe("schemaTypesOf", () => {
  it("handles string and array @type forms", () => {
    expect(schemaTypesOf({ "@type": "Article" })).toEqual(["Article"]);
    expect(schemaTypesOf({ "@type": ["BlogPosting", "Article"] })).toEqual([
      "BlogPosting",
      "Article",
    ]);
    expect(schemaTypesOf({})).toEqual([]);
  });
});

describe("evaluateSchemaCompleteness", () => {
  it("evaluates Article schema completeness", () => {
    const schemas = [
      {
        "@type": "Article",
        headline: "Test Article",
        author: { "@type": "Person", name: "John" },
        datePublished: "2026-01-01",
      },
    ];

    const result = evaluateSchemaCompleteness(schemas);

    expect(result.totalTypes).toBe(1);
    expect(result.avgCompleteness).toBe(1);
    expect(result.details[0].missing.length).toBe(0);
  });

  it("identifies missing properties", () => {
    const schemas = [
      {
        "@type": "Article",
        headline: "Test Article",
      },
    ];

    const result = evaluateSchemaCompleteness(schemas);

    expect(result.totalTypes).toBe(1);
    expect(result.avgCompleteness).toBeLessThan(1);
    expect(result.details[0].missing).toContain("author");
    expect(result.details[0].missing).toContain("datePublished");
  });

  it("ignores unknown schema types", () => {
    const schemas = [
      {
        "@type": "UnknownType",
        foo: "bar",
      },
    ];

    const result = evaluateSchemaCompleteness(schemas);

    expect(result.totalTypes).toBe(0);
  });

  it("handles multiple schemas", () => {
    const schemas = [
      {
        "@type": "Article",
        headline: "Test",
        author: "John",
        datePublished: "2026-01-01",
      },
      {
        "@type": "Organization",
        name: "TechCorp",
        url: "https://example.com",
      },
    ];

    const result = evaluateSchemaCompleteness(schemas);

    expect(result.totalTypes).toBe(2);
    expect(result.avgCompleteness).toBe(1);
  });

  it("handles empty array", () => {
    const result = evaluateSchemaCompleteness([]);

    expect(result.totalTypes).toBe(0);
    expect(result.avgCompleteness).toBe(0);
  });

  it("grades multi-typed objects against the first recognized type", () => {
    const schemas = [
      {
        "@type": ["BlogPosting", "Article"],
        headline: "Test",
        author: "Jo",
        datePublished: "2026-01-01",
      },
    ];

    const result = evaluateSchemaCompleteness(schemas);

    expect(result.totalTypes).toBe(1);
    expect(result.details[0].type).toBe("BlogPosting");
    expect(result.avgCompleteness).toBe(1);
  });
});
