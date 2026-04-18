import { describe, expect, it } from "vitest";
import {
  getDomain,
  isValidUrl,
  normalizeUrl,
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

  it("returns input for invalid URL", () => {
    expect(getDomain("not-a-url")).toBe("not-a-url");
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
