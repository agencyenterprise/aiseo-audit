import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { auditAuthorityContext } from "../../../src/modules/authority-context/index.js";
import { findFactor as findAuditFactor } from "../../helpers/factors.js";
import { buildPage } from "../../helpers/page.js";

const CLOCK_PINNED_MID_MONTH = new Date("2026-06-15T12:00:00Z");

beforeAll(() => {
  vi.useFakeTimers({ now: CLOCK_PINNED_MID_MONTH });
});

afterAll(() => {
  vi.useRealTimers();
});

function findFactor(name: string, page: ReturnType<typeof buildPage>) {
  return findAuditFactor(auditAuthorityContext(page), name);
}

describe("auditAuthorityContext", () => {
  it("scores zero for an empty page with no authority signals", () => {
    const page = buildPage("<html><body><p>Hello world</p></body></html>");
    const result = auditAuthorityContext(page);

    expect(result.category.score).toBe(0);
    for (const factor of result.category.factors) {
      expect(factor.score).toBe(0);
    }
  });

  it("counts only the scorable factors toward the category maxScore", () => {
    const page = buildPage("<html><body><p>Hello world</p></body></html>");
    const result = auditAuthorityContext(page);

    expect(result.category.maxScore).toBe(42);
  });

  it("finds author via rel=author link", () => {
    const page = buildPage(
      '<html><body><a rel="author">Jane Doe</a></body></html>',
    );
    const factor = findFactor("Author Attribution", page);

    expect(factor?.score).toBe(10);
    expect(factor?.value).toBe("Jane Doe");
  });

  describe("Date Markup diagnostic", () => {
    it("surfaces a machine-readable date from a content attribute", () => {
      const page = buildPage(
        '<html><head><meta property="article:published_time" content="2025-06-15" /></head><body></body></html>',
      );
      const factor = findFactor("Date Markup", page);

      expect(factor?.status).toBe("info");
      expect(factor?.score).toBe(0);
      expect(factor?.maxScore).toBe(0);
      expect(factor?.value).toBe("Machine-readable date found: 2025-06-15");
    });

    it("surfaces a visible date from text content", () => {
      const page = buildPage(
        '<html><body><span class="published">June 15, 2025</span></body></html>',
      );
      const factor = findFactor("Date Markup", page);

      expect(factor?.status).toBe("info");
      expect(factor?.value).toBe("Machine-readable date found: June 15, 2025");
    });

    it("notes when no date markup exists", () => {
      const page = buildPage("<html><body><p>Undated prose</p></body></html>");
      expect(findFactor("Date Markup", page)?.value).toBe(
        "No machine-readable date markup",
      );
    });
  });

  describe("Topic Time Sensitivity diagnostic", () => {
    it("flags a year-stamped title as time-sensitive", () => {
      const page = buildPage(
        "<html><head><title>Best Tools 2026</title></head><body><p>Roundup</p></body></html>",
      );
      const factor = findFactor("Topic Time Sensitivity", page);

      expect(factor?.status).toBe("info");
      expect(factor?.maxScore).toBe(0);
      expect(factor?.value).toContain("year in title or H1");
    });

    it("calls an unstamped page evergreen", () => {
      const page = buildPage(
        "<html><head><title>Sourdough Basics</title></head><body><p>Flour and water</p></body></html>",
      );
      expect(findFactor("Topic Time Sensitivity", page)?.value).toBe(
        "Evergreen topic, freshness not scored",
      );
    });
  });

  describe("Content Freshness", () => {
    const timeSensitivePage = (dateMeta: string) =>
      buildPage(
        `<html><head><title>Best Tools 2026</title>${dateMeta}</head><body><p>Roundup</p></body></html>`,
      );

    it("scores 12 for a time-sensitive page dated within 24 months", () => {
      const page = timeSensitivePage(
        '<meta property="article:published_time" content="2024-06-15" />',
      );
      const factor = findFactor("Content Freshness", page);

      expect(factor?.score).toBe(12);
      expect(factor?.maxScore).toBe(12);
    });

    it("scores 0 for a time-sensitive page one month past the 24-month window", () => {
      const page = timeSensitivePage(
        '<meta property="article:published_time" content="2024-05-15" />',
      );
      const factor = findFactor("Content Freshness", page);

      expect(factor?.score).toBe(0);
      expect(factor?.value).toContain("Visibly stale");
    });

    it("stays neutral for a time-sensitive page with no parseable date", () => {
      const page = timeSensitivePage("");
      const factor = findFactor("Content Freshness", page);

      expect(factor?.status).toBe("neutral");
      expect(factor?.value).toContain("No parseable date");
    });

    it("stays neutral for an evergreen page regardless of date", () => {
      const page = buildPage(
        '<html><head><title>Sourdough Basics</title><meta property="article:published_time" content="2026-05-15" /></head><body><p>Flour</p></body></html>',
      );
      const factor = findFactor("Content Freshness", page);

      expect(factor?.status).toBe("neutral");
      expect(factor?.value).toBe("Evergreen topic, freshness not applicable");
    });
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

  describe("commercial and site-type diagnostics", () => {
    it.each([
      "Promotional Language",
      "Affiliate Link Density",
      "Ad Slot Markers",
      "Site Type",
    ])("reports %s as an unscored info diagnostic", (name) => {
      const page = buildPage(
        '<html><body><p>Buy now! Limited time offer!</p><a href="https://amzn.to/x?tag=aff">Deal</a><div class="advert"></div></body></html>',
      );
      const factor = findFactor(name, page);

      expect(factor?.status).toBe("info");
      expect(factor?.score).toBe(0);
      expect(factor?.maxScore).toBe(0);
    });
  });

  it("scores all authority signals when fully present", () => {
    const page = buildPage(
      `<html><head>
        <title>Example Corp Guide 2026</title>
        <meta property="og:title" content="Test" />
        <meta property="og:description" content="A test page" />
        <meta property="og:image" content="https://example.com/img.png" />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Example Corp" />
        <meta property="article:published_time" content="2026-04-15" />
        <link rel="canonical" href="https://example.com/test" />
        <script type="application/ld+json">{"@type":"Organization","name":"Example Corp"}</script>
      </head><body>
        <a rel="author">Jane Doe</a>
        <time datetime="2026-04-15">2026-04-15</time>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </body></html>`,
    );
    const result = auditAuthorityContext(page);

    expect(findFactor("Author Attribution", page)?.score).toBe(10);
    expect(findFactor("Organization Identity", page)?.score).toBe(10);
    expect(findFactor("Contact/About Links", page)?.score).toBe(10);
    expect(findFactor("Content Freshness", page)?.score).toBe(12);
    expect(findFactor("Structured Data", page)?.score).toBe(12);
    expect(result.category.score).toBeGreaterThan(0);
  });
});
