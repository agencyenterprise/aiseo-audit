import { describe, expect, it } from "vitest";
import {
  getDomain,
  isSameSite,
  isValidUrl,
  normalizeUrl,
  originOf,
  slugifyUrl,
} from "../../src/utils/url.js";

describe("normalizeUrl", () => {
  it("adds https:// when missing", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("www.example.com")).toBe("https://www.example.com");
  });

  it("preserves existing https://", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("preserves existing http://", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("removes trailing slashes", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com");
    expect(normalizeUrl("https://example.com///")).toBe("https://example.com");
  });

  it("preserves paths", () => {
    expect(normalizeUrl("example.com/path/to/page")).toBe(
      "https://example.com/path/to/page",
    );
  });

  it("trims whitespace", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com");
  });
});

describe("isValidUrl", () => {
  it("returns true for valid URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://example.com")).toBe(true);
    expect(isValidUrl("example.com")).toBe(true);
    expect(isValidUrl("www.example.com/path")).toBe(true);
  });

  it("returns false for invalid URLs", () => {
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("://invalid")).toBe(false);
  });
});

describe("getDomain", () => {
  it("extracts domain from URL", () => {
    expect(getDomain("https://example.com/path")).toBe("example.com");
    expect(getDomain("https://www.example.com")).toBe("www.example.com");
    expect(getDomain("https://sub.domain.example.com")).toBe(
      "sub.domain.example.com",
    );
  });

  it("returns null for invalid URL", () => {
    expect(getDomain("not-a-url")).toBe(null);
    expect(getDomain("http://")).toBe(null);
  });
});

describe("normalizeUrl query/fragment safety", () => {
  it("preserves query strings ending in a slash", () => {
    expect(normalizeUrl("https://example.com/search?next=/foo/")).toBe(
      "https://example.com/search?next=/foo/",
    );
  });

  it("strips trailing slashes from the path but keeps the query", () => {
    expect(normalizeUrl("https://example.com/blog/?page=2")).toBe(
      "https://example.com/blog?page=2",
    );
  });
});

describe("originOf", () => {
  it("returns scheme + host for a deep page URL", () => {
    expect(originOf("https://example.com/blog/post?x=1")).toBe(
      "https://example.com",
    );
  });

  it("preserves non-default ports", () => {
    expect(originOf("http://localhost:3000/page.html")).toBe(
      "http://localhost:3000",
    );
  });

  it("normalizes protocol-less input", () => {
    expect(originOf("example.com/path")).toBe("https://example.com");
  });
});

describe("isSameSite", () => {
  it("treats a subdomain and its parent as the same site", () => {
    expect(isSameSite("www.example.com", "example.com")).toBe(true);
    expect(isSameSite("example.com", "blog.example.com")).toBe(true);
  });

  it("treats unrelated hosts as different sites", () => {
    expect(isSameSite("example.com", "notexample.com")).toBe(false);
    expect(isSameSite("example.com", "example.org")).toBe(false);
  });
});

describe("slugifyUrl", () => {
  it("turns a bare domain into a filesystem-safe slug", () => {
    expect(slugifyUrl("https://example.com")).toBe("example-com");
  });

  it("preserves subdomain, path and drops protocol", () => {
    expect(slugifyUrl("https://www.example.com/pricing/enterprise")).toBe(
      "www-example-com-pricing-enterprise",
    );
  });

  it("collapses consecutive separators", () => {
    expect(slugifyUrl("https://example.com///a//b/")).toBe("example-com-a-b");
  });

  it("strips query strings and fragments", () => {
    expect(slugifyUrl("https://example.com/path?q=1&x=2#section")).toBe(
      "example-com-path",
    );
  });

  it("lowercases the slug", () => {
    expect(slugifyUrl("https://EXAMPLE.COM/Path")).toBe("example-com-path");
  });

  it("handles URLs passed without a protocol", () => {
    expect(slugifyUrl("example.com/path")).toBe("example-com-path");
  });

  it("is idempotent — re-slugifying a slug returns the same slug", () => {
    const slug = slugifyUrl("https://example.com/path");
    expect(slugifyUrl(slug)).toBe(slug);
  });
});
