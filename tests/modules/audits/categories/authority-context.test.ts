import { describe, expect, it } from "vitest";
import { auditAuthorityContext } from "../../../../src/modules/audits/categories/authority-context.js";
import { extractPage } from "../../../../src/modules/extractor/service.js";

function buildPage(html: string) {
  return extractPage(html, "https://example.com/test");
}

function findFactor(name: string, page: ReturnType<typeof buildPage>) {
  const result = auditAuthorityContext(page);
  return result.category.factors.find((f) => f.name === name);
}

describe("auditAuthorityContext", () => {
  it("scores zero for an empty page with no authority signals", () => {
    const page = buildPage("<html><body><p>Hello world</p></body></html>");
    const result = auditAuthorityContext(page);

    expect(result.category.score).toBe(0);
    for (const factor of result.category.factors) {
      if (factor.name !== "Entity Consistency") {
        expect(factor.score).toBe(0);
      }
    }
  });

  it("finds author via rel=author link", () => {
    const page = buildPage(
      '<html><body><a rel="author">Jane Doe</a></body></html>',
    );
    const factor = findFactor("Author Attribution", page);

    expect(factor?.score).toBe(10);
    expect(factor?.value).toBe("Jane Doe");
  });

  it("finds publication date via content attribute", () => {
    const page = buildPage(
      '<html><head><meta property="article:published_time" content="2025-06-15" /></head><body></body></html>',
    );
    const factor = findFactor("Publication Date", page);

    expect(factor?.score).toBe(8);
    expect(factor?.value).toBe("2025-06-15");
  });

  it("finds publication date via text content", () => {
    const page = buildPage(
      '<html><body><span class="published">June 15, 2025</span></body></html>',
    );
    const factor = findFactor("Publication Date", page);

    expect(factor?.score).toBe(8);
    expect(factor?.value).toBe("June 15, 2025");
  });

  it("scores freshness at 5 for content 13-24 months old", () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 18);
    const dateStr = date.toISOString().split("T")[0];

    const page = buildPage(
      `<html><head><meta property="article:published_time" content="${dateStr}" /></head><body><time datetime="${dateStr}">Old</time></body></html>`,
    );
    const factor = findFactor("Content Freshness", page);

    expect(factor?.score).toBe(5);
  });

  it("applies modified date bonus to freshness score", () => {
    const publishDate = new Date();
    publishDate.setMonth(publishDate.getMonth() - 18);
    const modifiedDate = new Date();
    modifiedDate.setMonth(modifiedDate.getMonth() - 18);

    const page = buildPage(
      `<html><head>
        <meta property="article:published_time" content="${publishDate.toISOString().split("T")[0]}" />
        <meta property="article:modified_time" content="${modifiedDate.toISOString().split("T")[0]}" />
      </head><body>
        <time datetime="${publishDate.toISOString().split("T")[0]}">Old</time>
      </body></html>`,
    );
    const factor = findFactor("Content Freshness", page);

    expect(factor?.score).toBe(7);
  });

  it("scores partial OG tags between 1-2", () => {
    const page = buildPage(
      `<html><head>
        <meta property="og:title" content="Test" />
      </head><body></body></html>`,
    );
    const factor = findFactor("Structured Data", page);

    expect(factor?.score).toBe(2);
    expect(factor?.value).toContain("1/4 OG tags");
  });

  it("scores all authority signals when fully present", () => {
    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 2);
    const dateStr = recentDate.toISOString().split("T")[0];

    const page = buildPage(
      `<html><head>
        <meta property="og:title" content="Test" />
        <meta property="og:description" content="A test page" />
        <meta property="og:image" content="https://example.com/img.png" />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Example Corp" />
        <meta property="article:published_time" content="${dateStr}" />
        <link rel="canonical" href="https://example.com/test" />
        <script type="application/ld+json">{"@type":"Organization","name":"Example Corp"}</script>
      </head><body>
        <a rel="author">Jane Doe</a>
        <time datetime="${dateStr}">${dateStr}</time>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </body></html>`,
    );
    const result = auditAuthorityContext(page);

    expect(findFactor("Author Attribution", page)?.score).toBe(10);
    expect(findFactor("Organization Identity", page)?.score).toBe(10);
    expect(findFactor("Contact/About Links", page)?.score).toBe(10);
    expect(findFactor("Publication Date", page)?.score).toBe(8);
    expect(findFactor("Content Freshness", page)?.score).toBe(12);
    expect(findFactor("Structured Data", page)?.score).toBe(12);
    expect(result.category.score).toBeGreaterThan(0);
  });
});
