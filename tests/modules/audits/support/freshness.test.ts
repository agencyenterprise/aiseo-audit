import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { evaluateFreshness } from "../../../../src/modules/audits/support/freshness.js";

function load(html: string) {
  return cheerio.load(html);
}

describe("evaluateFreshness", () => {
  it("returns nulls when no date selectors exist", () => {
    const $ = load("<html><body><p>No dates here</p></body></html>");
    const result = evaluateFreshness($);

    expect(result.publishDate).toBeNull();
    expect(result.modifiedDate).toBeNull();
    expect(result.ageInMonths).toBeNull();
    expect(result.hasModifiedDate).toBe(false);
  });

  it("finds modifiedDate via datetime attribute", () => {
    const $ = load(
      '<html><body><meta itemprop="dateModified" datetime="2025-06-15" /></body></html>',
    );
    const result = evaluateFreshness($);

    expect(result.modifiedDate).toBe("2025-06-15");
    expect(result.hasModifiedDate).toBe(true);
  });

  it("finds modifiedDate via content attribute fallback", () => {
    const $ = load(
      '<html><head><meta property="article:modified_time" content="2025-06-15" /></head></html>',
    );
    const result = evaluateFreshness($);

    expect(result.modifiedDate).toBe("2025-06-15");
    expect(result.hasModifiedDate).toBe(true);
  });

  it("finds modifiedDate via text content fallback", () => {
    const $ = load(
      '<html><body><span itemprop="dateModified">2025-06-15</span></body></html>',
    );
    const result = evaluateFreshness($);

    expect(result.modifiedDate).toBe("2025-06-15");
    expect(result.hasModifiedDate).toBe(true);
  });

  it("finds publishDate via datetime attribute", () => {
    const $ = load(
      '<html><body><time datetime="2025-01-10">January 10</time></body></html>',
    );
    const result = evaluateFreshness($);

    expect(result.publishDate).toBe("2025-01-10");
  });

  it("finds publishDate via content attribute fallback", () => {
    const $ = load(
      '<html><head><meta property="article:published_time" content="2025-01-10" /></head></html>',
    );
    const result = evaluateFreshness($);

    expect(result.publishDate).toBe("2025-01-10");
  });

  it("finds publishDate via text content fallback", () => {
    const $ = load(
      '<html><body><span itemprop="datePublished">2025-01-10</span></body></html>',
    );
    const result = evaluateFreshness($);

    expect(result.publishDate).toBe("2025-01-10");
  });

  it("computes ageInMonths from a valid date", () => {
    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 3);
    const dateStr = recentDate.toISOString().split("T")[0];

    const $ = load(
      `<html><body><time datetime="${dateStr}">Recent</time></body></html>`,
    );
    const result = evaluateFreshness($);

    expect(result.ageInMonths).toBe(3);
  });

  it("returns ageInMonths null when date string is unparseable", () => {
    const $ = load(
      '<html><body><time datetime="not-a-date">Sometime</time></body></html>',
    );
    const result = evaluateFreshness($);

    expect(result.publishDate).toBe("not-a-date");
    expect(result.ageInMonths).toBeNull();
  });

  it("prefers modifiedDate over publishDate for age calculation", () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 12);
    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 2);

    const $ = load(
      `<html><head>
        <meta property="article:modified_time" content="${recentDate.toISOString().split("T")[0]}" />
        <meta property="article:published_time" content="${oldDate.toISOString().split("T")[0]}" />
      </head></html>`,
    );
    const result = evaluateFreshness($);

    expect(result.modifiedDate).toBeDefined();
    expect(result.publishDate).toBeDefined();
    expect(result.ageInMonths).toBe(2);
  });
});
