import { describe, expect, it } from "vitest";
import { detectTimeSensitivity } from "../../../src/modules/authority-context/time-sensitivity.js";
import { buildPage } from "../../helpers/page.js";

const EVERGREEN_URL = "https://example.com/guides/espresso";
const EVERGREEN_TITLE = "Espresso Fundamentals";
const EVERGREEN_META = "A timeless walkthrough of espresso extraction.";

function detect(overrides: {
  html?: string;
  url?: string;
  title?: string;
  metaDescription?: string;
  structuredDataTypes?: string[];
}) {
  const page = buildPage(
    overrides.html ?? "<body><h1>Espresso Fundamentals</h1></body>",
  );
  return detectTimeSensitivity(
    page.$,
    overrides.url ?? EVERGREEN_URL,
    overrides.title ?? EVERGREEN_TITLE,
    overrides.metaDescription ?? EVERGREEN_META,
    overrides.structuredDataTypes ?? [],
  );
}

describe("detectTimeSensitivity", () => {
  it("treats a NewsArticle schema page as time sensitive", () => {
    expect(detect({ structuredDataTypes: ["NewsArticle"] })).toEqual({
      timeSensitive: true,
      signals: ["NewsArticle schema"],
    });
  });

  it("treats an Event schema page as time sensitive", () => {
    expect(detect({ structuredDataTypes: ["Event"] })).toEqual({
      timeSensitive: true,
      signals: ["Event schema"],
    });
  });

  it("treats a LiveBlogPosting schema page as time sensitive", () => {
    expect(detect({ structuredDataTypes: ["LiveBlogPosting"] })).toEqual({
      timeSensitive: true,
      signals: ["LiveBlogPosting schema"],
    });
  });

  it("flags a 20xx year in the title", () => {
    expect(detect({ title: "Espresso Gear Picks for 2025" })).toEqual({
      timeSensitive: true,
      signals: ["year in title or H1"],
    });
  });

  it("flags a 20xx year that only appears in the first H1", () => {
    expect(
      detect({ html: "<body><h1>Espresso Gear Picks for 2026</h1></body>" }),
    ).toEqual({
      timeSensitive: true,
      signals: ["year in title or H1"],
    });
  });

  it("flags trend vocabulary in the title", () => {
    expect(detect({ title: "Latest Espresso Machines" })).toEqual({
      timeSensitive: true,
      signals: ["trend vocabulary in title or description"],
    });
  });

  it("flags trend vocabulary in the meta description", () => {
    expect(
      detect({ metaDescription: "Explore current picks for espresso lovers." }),
    ).toEqual({
      timeSensitive: true,
      signals: ["trend vocabulary in title or description"],
    });
  });

  it("flags a news URL path segment", () => {
    expect(detect({ url: "https://example.com/news/espresso-report" })).toEqual(
      {
        timeSensitive: true,
        signals: ["news or blog URL path"],
      },
    );
  });

  it("flags a blog URL path segment", () => {
    expect(detect({ url: "https://example.com/blog/espresso-report" })).toEqual(
      {
        timeSensitive: true,
        signals: ["news or blog URL path"],
      },
    );
  });

  it("leaves an evergreen page with no signals untouched", () => {
    expect(detect({ structuredDataTypes: ["Article"] })).toEqual({
      timeSensitive: false,
      signals: [],
    });
  });
});
