import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FetchError, httpGet, httpHead } from "../../src/utils/http.js";

const BASE_OPTS = {
  url: "https://example.com",
  timeout: 5000,
  userAgent: "test-agent",
};

describe("FetchError", () => {
  it("has correct name, code, url, and message", () => {
    const err = new FetchError("TIMEOUT", "https://example.com", "timed out");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("FetchError");
    expect(err.code).toBe("TIMEOUT");
    expect(err.url).toBe("https://example.com");
    expect(err.message).toBe("timed out");
  });
});

describe("httpGet error classification", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("classifies AbortError as TIMEOUT", async () => {
    const abortErr = new DOMException(
      "The operation was aborted",
      "AbortError",
    );
    fetchSpy.mockRejectedValue(abortErr);

    try {
      await httpGet(BASE_OPTS);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FetchError);
      expect((err as FetchError).code).toBe("TIMEOUT");
      expect((err as FetchError).url).toBe(BASE_OPTS.url);
      expect((err as FetchError).message).toContain("timed out");
    }
  });

  it("classifies DNS failure (ENOTFOUND) as DNS_FAILURE", async () => {
    const dnsErr = new TypeError("fetch failed");
    (dnsErr as any).cause = new Error("getaddrinfo ENOTFOUND example.com");
    fetchSpy.mockRejectedValue(dnsErr);

    try {
      await httpGet(BASE_OPTS);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FetchError);
      expect((err as FetchError).code).toBe("DNS_FAILURE");
      expect((err as FetchError).message).toContain("example.com");
    }
  });

  it("classifies ECONNREFUSED as CONNECTION_REFUSED", async () => {
    const connErr = new TypeError("fetch failed");
    (connErr as any).cause = new Error("connect ECONNREFUSED 127.0.0.1:443");
    fetchSpy.mockRejectedValue(connErr);

    try {
      await httpGet(BASE_OPTS);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FetchError);
      expect((err as FetchError).code).toBe("CONNECTION_REFUSED");
      expect((err as FetchError).message).toContain("may be down");
    }
  });

  it("classifies TLS/certificate errors as TLS_ERROR", async () => {
    const tlsErr = new TypeError("fetch failed");
    (tlsErr as any).cause = new Error("unable to verify the first certificate");
    fetchSpy.mockRejectedValue(tlsErr);

    try {
      await httpGet(BASE_OPTS);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FetchError);
      expect((err as FetchError).code).toBe("TLS_ERROR");
      expect((err as FetchError).message).toContain("certificate");
    }
  });

  it("classifies unknown errors as NETWORK_ERROR", async () => {
    fetchSpy.mockRejectedValue(new Error("something unexpected"));

    try {
      await httpGet(BASE_OPTS);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FetchError);
      expect((err as FetchError).code).toBe("NETWORK_ERROR");
      expect((err as FetchError).message).toContain("something unexpected");
    }
  });

  it("classifies oversized content-length as TOO_LARGE", async () => {
    const headers = new Headers({ "content-length": "999999999999" });
    const mockResponse = new Response("", { status: 200, headers });
    Object.defineProperty(mockResponse, "url", { value: BASE_OPTS.url });
    fetchSpy.mockResolvedValue(mockResponse);

    try {
      await httpGet(BASE_OPTS);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FetchError);
      expect((err as FetchError).code).toBe("TOO_LARGE");
      expect((err as FetchError).message).toContain("size limit");
    }
  });

  it("passes through FetchError without re-wrapping", async () => {
    const original = new FetchError(
      "TIMEOUT",
      "https://x.com",
      "already classified",
    );
    fetchSpy.mockRejectedValue(original);

    try {
      await httpGet(BASE_OPTS);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBe(original);
    }
  });

  it("returns successfully on valid response", async () => {
    const headers = new Headers({ "content-type": "text/html" });
    const mockResponse = new Response("<html></html>", {
      status: 200,
      headers,
    });
    Object.defineProperty(mockResponse, "url", { value: BASE_OPTS.url });
    fetchSpy.mockResolvedValue(mockResponse);

    const result = await httpGet(BASE_OPTS);
    expect(result.status).toBe(200);
    expect(result.data).toBe("<html></html>");
    expect(result.finalUrl).toBe(BASE_OPTS.url);
  });
});

describe("httpHead error classification", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("classifies AbortError as TIMEOUT", async () => {
    fetchSpy.mockRejectedValue(new DOMException("aborted", "AbortError"));

    try {
      await httpHead(BASE_OPTS);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FetchError);
      expect((err as FetchError).code).toBe("TIMEOUT");
    }
  });

  it("classifies DNS failure as DNS_FAILURE", async () => {
    const dnsErr = new TypeError("fetch failed");
    (dnsErr as any).cause = new Error("getaddrinfo ENOTFOUND example.com");
    fetchSpy.mockRejectedValue(dnsErr);

    try {
      await httpHead(BASE_OPTS);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FetchError);
      expect((err as FetchError).code).toBe("DNS_FAILURE");
    }
  });

  it("returns successfully on valid response", async () => {
    const headers = new Headers({ "content-type": "text/html" });
    const mockResponse = new Response(null, { status: 200, headers });
    Object.defineProperty(mockResponse, "url", { value: BASE_OPTS.url });
    fetchSpy.mockResolvedValue(mockResponse);

    const result = await httpHead(BASE_OPTS);
    expect(result.status).toBe(200);
    expect(result.data).toBe("");
  });
});
