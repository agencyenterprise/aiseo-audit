import { describe, expect, it } from "vitest";
import { checkCrawlerAccess } from "../../../../src/modules/audits/support/robots.js";
import { evaluateSchemaCompleteness } from "../../../../src/modules/audits/support/schema-analysis.js";

describe("checkCrawlerAccess", () => {
  it("returns all unknown when no robots.txt", () => {
    const result = checkCrawlerAccess(null);

    expect(result.unknown.length).toBeGreaterThan(0);
    expect(result.allowed.length).toBe(0);
    expect(result.blocked.length).toBe(0);
  });

  it("detects blocked crawlers", () => {
    const robotsTxt = `
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.blocked).toContain("GPTBot");
    expect(result.blocked).toContain("ClaudeBot");
  });

  it("detects allowed crawlers via wildcard", () => {
    const robotsTxt = `
User-agent: *
Allow: /
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.blocked.length).toBe(0);
  });

  it("detects wildcard blocking", () => {
    const robotsTxt = `
User-agent: *
Disallow: /
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.blocked.length).toBeGreaterThan(0);
  });

  it("surfaces path-level block in partiallyBlocked without marking crawler as blocked", () => {
    const robotsTxt = `
User-agent: GPTBot
Disallow: /blog/
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.blocked).not.toContain("GPTBot");
    expect(result.allowed).toContain("GPTBot");
    expect(result.partiallyBlocked).toBeDefined();
    expect(result.partiallyBlocked?.some((e) => e.includes("GPTBot"))).toBe(
      true,
    );
    expect(result.partiallyBlocked?.some((e) => e.includes("/blog/"))).toBe(
      true,
    );
  });

  it("allow overrides disallow at equal path specificity", () => {
    const robotsTxt = `
User-agent: GPTBot
Disallow: /
Allow: /
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.blocked).not.toContain("GPTBot");
  });

  it("crawler-specific rule takes precedence over wildcard", () => {
    const robotsTxt = `
User-agent: *
Disallow: /

User-agent: GPTBot
Allow: /
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.allowed).toContain("GPTBot");
    expect(result.blocked).not.toContain("GPTBot");
  });

  it("longer allow path wins over shorter disallow for site-level access", () => {
    const robotsTxt = `
User-agent: GPTBot
Disallow: /private/
Allow: /
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.blocked).not.toContain("GPTBot");
    expect(result.allowed).toContain("GPTBot");
    expect(result.partiallyBlocked?.some((e) => e.includes("/private/"))).toBe(
      true,
    );
  });

  it("ignores comment lines", () => {
    const robotsTxt = `
# Block all AI bots
User-agent: GPTBot
# Disallow: /
Allow: /
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.blocked).not.toContain("GPTBot");
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
});
