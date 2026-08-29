import { describe, expect, it } from "vitest";
import { detectSiteType } from "../../../src/modules/authority-context/site-type.js";
import { buildPage } from "../../helpers/page.js";

const PLAIN_URL = "https://example.com/articles/latte-art";

function detect(overrides: {
  html?: string;
  url?: string;
  structuredDataTypes?: string[];
}) {
  const page = buildPage(overrides.html ?? "<body><p>post body</p></body>");
  return detectSiteType(
    page.$,
    overrides.url ?? PLAIN_URL,
    overrides.structuredDataTypes ?? [],
  );
}

describe("detectSiteType", () => {
  describe("forum schema types", () => {
    it("flags a DiscussionForumPosting schema as forum like", () => {
      expect(
        detect({ structuredDataTypes: ["DiscussionForumPosting"] }),
      ).toEqual({
        forumLike: true,
        signals: ["DiscussionForumPosting schema"],
      });
    });

    it("flags a QAPage schema as forum like", () => {
      expect(detect({ structuredDataTypes: ["QAPage"] })).toEqual({
        forumLike: true,
        signals: ["QAPage schema"],
      });
    });

    it("flags a SocialMediaPosting schema as forum like", () => {
      expect(detect({ structuredDataTypes: ["SocialMediaPosting"] })).toEqual({
        forumLike: true,
        signals: ["SocialMediaPosting schema"],
      });
    });
  });

  describe("forum software generators", () => {
    it("flags a Discourse generator and records it in the signals", () => {
      const result = detect({
        html: '<head><meta name="generator" content="Discourse 3.2.0"></head><body><p>topic</p></body>',
      });
      expect(result).toEqual({
        forumLike: true,
        signals: ["Discourse 3.2.0 generator"],
      });
    });

    it("flags a phpBB generator and records it in the signals", () => {
      const result = detect({
        html: '<head><meta name="generator" content="phpBB 3.3.10"></head><body><p>topic</p></body>',
      });
      expect(result).toEqual({
        forumLike: true,
        signals: ["phpBB 3.3.10 generator"],
      });
    });
  });

  describe("forum style URLs", () => {
    it("flags a forum path segment", () => {
      expect(detect({ url: "https://example.com/forum/gear" })).toEqual({
        forumLike: true,
        signals: ["forum-style URL path"],
      });
    });

    it("flags a thread path segment", () => {
      expect(detect({ url: "https://example.com/thread/12345" })).toEqual({
        forumLike: true,
        signals: ["forum-style URL path"],
      });
    });

    it("flags a community path segment", () => {
      expect(detect({ url: "https://example.com/community/baristas" })).toEqual(
        {
          forumLike: true,
          signals: ["forum-style URL path"],
        },
      );
    });

    it("flags a short t path segment", () => {
      expect(detect({ url: "https://example.com/t/espresso-help/42" })).toEqual(
        {
          forumLike: true,
          signals: ["forum-style URL path"],
        },
      );
    });
  });

  it("leaves a plain blog page unflagged", () => {
    const result = detect({
      html: '<head><meta name="generator" content="WordPress 6.4"></head><body><article><p>a calm essay about latte art</p></article></body>',
    });
    expect(result).toEqual({ forumLike: false, signals: [] });
  });
});
