import {
  DEFAULT_HEADERS,
  MAX_RESPONSE_SIZE,
} from "../modules/fetcher/constants.js";
import type { HttpRequestOptionsType, HttpResponseType } from "./schema.js";

export type FetchErrorCode =
  | "TIMEOUT"
  | "DNS_FAILURE"
  | "CONNECTION_REFUSED"
  | "TLS_ERROR"
  | "TOO_LARGE"
  | "NETWORK_ERROR";

export class FetchError extends Error {
  readonly code: FetchErrorCode;
  readonly url: string;

  constructor(code: FetchErrorCode, url: string, message: string) {
    super(message);
    this.name = "FetchError";
    this.code = code;
    this.url = url;
  }
}

function classifyFetchError(err: unknown, url: string): FetchError {
  if (err instanceof FetchError) return err;

  const msg = err instanceof Error ? err.message : String(err);
  const cause =
    err instanceof Error && err.cause instanceof Error ? err.cause.message : "";
  const combined = `${msg} ${cause}`.toLowerCase();

  if (
    err instanceof DOMException ||
    (err instanceof Error && err.name === "AbortError") ||
    combined.includes("abort")
  ) {
    return new FetchError(
      "TIMEOUT",
      url,
      `Request timed out. The server at "${new URL(url).hostname}" did not respond in time.`,
    );
  }

  if (combined.includes("getaddrinfo") || combined.includes("enotfound")) {
    const hostname = new URL(url).hostname;
    return new FetchError(
      "DNS_FAILURE",
      url,
      `DNS lookup failed for "${hostname}". Check that the domain exists and is spelled correctly.`,
    );
  }

  if (combined.includes("econnrefused")) {
    return new FetchError(
      "CONNECTION_REFUSED",
      url,
      `Connection refused by "${new URL(url).hostname}". The server may be down or not accepting connections.`,
    );
  }

  if (
    combined.includes("cert") ||
    combined.includes("ssl") ||
    combined.includes("tls") ||
    combined.includes("unable to verify")
  ) {
    return new FetchError(
      "TLS_ERROR",
      url,
      `TLS/SSL error connecting to "${new URL(url).hostname}". The site may have an invalid or expired certificate.`,
    );
  }

  return new FetchError(
    "NETWORK_ERROR",
    url,
    `Network error fetching "${url}": ${msg}`,
  );
}

export async function httpGet(
  options: HttpRequestOptionsType,
): Promise<HttpResponseType> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout);

  try {
    const response = await fetch(options.url, {
      method: "GET",
      headers: {
        "User-Agent": options.userAgent,
        ...DEFAULT_HEADERS,
      },
      signal: controller.signal,
      redirect: "follow",
    });

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      throw new FetchError(
        "TOO_LARGE",
        options.url,
        `Response from "${new URL(options.url).hostname}" exceeds the ${Math.round(MAX_RESPONSE_SIZE / 1024 / 1024)}MB size limit.`,
      );
    }

    const data = await response.text();

    if (data.length > MAX_RESPONSE_SIZE) {
      throw new FetchError(
        "TOO_LARGE",
        options.url,
        `Response from "${new URL(options.url).hostname}" exceeds the ${Math.round(MAX_RESPONSE_SIZE / 1024 / 1024)}MB size limit.`,
      );
    }

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      status: response.status,
      data,
      headers,
      finalUrl: response.url,
    };
  } catch (err) {
    throw classifyFetchError(err, options.url);
  } finally {
    clearTimeout(timer);
  }
}

export async function httpHead(
  options: HttpRequestOptionsType,
): Promise<HttpResponseType> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout);

  try {
    const response = await fetch(options.url, {
      method: "HEAD",
      headers: {
        "User-Agent": options.userAgent,
        ...DEFAULT_HEADERS,
      },
      signal: controller.signal,
      redirect: "follow",
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      status: response.status,
      data: "",
      headers,
      finalUrl: response.url,
    };
  } catch (err) {
    throw classifyFetchError(err, options.url);
  } finally {
    clearTimeout(timer);
  }
}
