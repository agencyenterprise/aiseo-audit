import { describe, expect, it } from "vitest";
import { evaluateSchemaCompleteness } from "../../../src/modules/authority-context/schema-analysis.js";

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
});
