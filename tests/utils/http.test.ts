import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FetchError, httpGet, httpProbe } from "../../src/utils/http.js";

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

  it("lets fetch negotiate content encoding instead of forcing one", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    Object.defineProperty(mockResponse, "url", { value: BASE_OPTS.url });
    fetchSpy.mockResolvedValue(mockResponse);

    await httpGet(BASE_OPTS);

    const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
    const headerNames = Object.keys(
      requestInit.headers as Record<string, string>,
    ).map((h) => h.toLowerCase());
    expect(headerNames).not.toContain("accept-encoding");
  });
});

describe("httpGet size cap", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("throws TOO_LARGE for a chunked body without a content-length, cancelling the stream near the cap", async () => {
    const chunk = new Uint8Array(1024 * 1024).fill(97);
    let pushed = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pushed >= 15) {
          controller.close();
          return;
        }
        pushed++;
        controller.enqueue(chunk);
      },
    });
    const mockResponse = new Response(body, { status: 200 });
    Object.defineProperty(mockResponse, "url", { value: BASE_OPTS.url });
    fetchSpy.mockResolvedValue(mockResponse);

    await expect(httpGet(BASE_OPTS)).rejects.toMatchObject({
      code: "TOO_LARGE",
    });
    const chunksJustPastTheTenMegabyteCap = 12;
    expect(pushed).toBeLessThanOrEqual(chunksJustPastTheTenMegabyteCap);
  });
});

describe("httpProbe", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("sends a Range header for the first bytes", async () => {
    const mockResponse = new Response("# llms.txt", { status: 206 });
    Object.defineProperty(mockResponse, "url", { value: BASE_OPTS.url });
    fetchSpy.mockResolvedValue(mockResponse);

    const result = await httpProbe(BASE_OPTS);

    expect(result.status).toBe(206);
    expect(result.data).toBe("# llms.txt");
    const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((requestInit.headers as Record<string, string>).Range).toMatch(
      /^bytes=0-\d+$/,
    );
  });

  it("truncates instead of buffering when the server ignores Range", async () => {
    const bigBody = "x".repeat(100_000);
    const mockResponse = new Response(bigBody, { status: 200 });
    Object.defineProperty(mockResponse, "url", { value: BASE_OPTS.url });
    fetchSpy.mockResolvedValue(mockResponse);

    const result = await httpProbe(BASE_OPTS);

    expect(result.status).toBe(200);
    expect(result.data.length).toBeLessThanOrEqual(512);
  });

  it("classifies errors the same way as httpGet", async () => {
    fetchSpy.mockRejectedValue(new DOMException("aborted", "AbortError"));

    await expect(httpProbe(BASE_OPTS)).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });
});
