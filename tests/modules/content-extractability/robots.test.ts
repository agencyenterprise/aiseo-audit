import { describe, expect, it } from "vitest";
import { checkCrawlerAccess } from "../../../src/modules/content-extractability/robots.js";

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

  it("treats 'Disallow: /*' and 'Disallow: *' as full blocks", () => {
    for (const path of ["/*", "*"]) {
      const result = checkCrawlerAccess(
        `User-agent: GPTBot\nDisallow: ${path}\n`,
      );
      expect(result.blocked).toContain("GPTBot");
    }
  });

  it("supports mid-path wildcards and end anchors", () => {
    const robotsTxt = `
User-agent: GPTBot
Disallow: /private/*/drafts
Disallow: /tmp$
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.allowed).toContain("GPTBot");
    expect(
      result.partiallyBlocked?.some((e) => e.includes("/private/*/drafts")),
    ).toBe(true);
  });

  it("tolerates blank lines inside a group", () => {
    const robotsTxt = `
User-agent: GPTBot

Disallow: /
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.blocked).toContain("GPTBot");
    expect(result.unknown).not.toContain("GPTBot");
  });

  it("starts a new group when user-agent follows rules", () => {
    const robotsTxt = `
User-agent: GPTBot
Disallow: /
User-agent: ClaudeBot
Allow: /
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.blocked).toContain("GPTBot");
    expect(result.allowed).toContain("ClaudeBot");
  });

  it("does not report a disallow cancelled by an identical allow as a partial block", () => {
    const robotsTxt = `
User-agent: GPTBot
Disallow: /private
Allow: /private
`;
    const result = checkCrawlerAccess(robotsTxt);

    expect(result.allowed).toContain("GPTBot");
    expect(
      result.partiallyBlocked?.some((e) => e.includes("/private")) ?? false,
    ).toBe(false);
  });
});
