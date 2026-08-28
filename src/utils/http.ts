export const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

const PROBE_MAX_BYTES = 512;

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

export type HttpRequestOptionsType = {
  url: string;
  timeout: number;
  userAgent: string;
};

export type HttpResponseType = {
  status: number;
  data: string;
  headers: Record<string, string>;
  finalUrl: string;
};

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

export async function httpGet(
  options: HttpRequestOptionsType,
): Promise<HttpResponseType> {
  return request(options, {}, rejectBodyOverCap);
}

export async function httpProbe(
  options: HttpRequestOptionsType,
): Promise<HttpResponseType> {
  return request(
    options,
    { Range: `bytes=0-${PROBE_MAX_BYTES - 1}` },
    truncateBodyToProbeCap,
  );
}

type BodyReaderType = (response: Response, url: string) => Promise<string>;

async function request(
  options: HttpRequestOptionsType,
  extraHeaders: Record<string, string>,
  readBody: BodyReaderType,
): Promise<HttpResponseType> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout);

  try {
    const response = await fetch(options.url, {
      method: "GET",
      headers: {
        "User-Agent": options.userAgent,
        ...DEFAULT_HEADERS,
        ...extraHeaders,
      },
      signal: controller.signal,
      redirect: "follow",
    });

    return {
      status: response.status,
      data: await readBody(response, options.url),
      headers: headersToRecord(response),
      finalUrl: response.url,
    };
  } catch (err) {
    throw classifyFetchError(err, options.url);
  } finally {
    clearTimeout(timer);
  }
}

async function rejectBodyOverCap(
  response: Response,
  url: string,
): Promise<string> {
  if (declaredLengthExceeds(response, MAX_RESPONSE_BYTES)) {
    throw tooLargeError(url);
  }
  const body = await streamBodyUpTo(response, MAX_RESPONSE_BYTES);
  if (body.overflowed) throw tooLargeError(url);
  return body.text;
}

async function truncateBodyToProbeCap(response: Response): Promise<string> {
  const body = await streamBodyUpTo(response, PROBE_MAX_BYTES);
  return body.text;
}

function declaredLengthExceeds(response: Response, maxBytes: number): boolean {
  const contentLength = response.headers.get("content-length");
  return contentLength !== null && parseInt(contentLength, 10) > maxBytes;
}

async function streamBodyUpTo(
  response: Response,
  maxBytes: number,
): Promise<{ text: string; overflowed: boolean }> {
  if (!response.body) {
    const data = await response.text();
    return {
      text: data.slice(0, maxBytes),
      overflowed: data.length > maxBytes,
    };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (received <= maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
    }
  } finally {
    if (received > maxBytes) await reader.cancel().catch(() => {});
  }

  return {
    text: decodeUpTo(chunks, Math.min(received, maxBytes)),
    overflowed: received > maxBytes,
  };
}

function decodeUpTo(chunks: Uint8Array[], byteCount: number): string {
  const combined = new Uint8Array(byteCount);
  let offset = 0;
  for (const chunk of chunks) {
    const remaining = combined.length - offset;
    if (remaining <= 0) break;
    combined.set(
      remaining >= chunk.byteLength ? chunk : chunk.subarray(0, remaining),
      offset,
    );
    offset += Math.min(chunk.byteLength, remaining);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(combined);
}

function headersToRecord(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

function tooLargeError(url: string): FetchError {
  const maxMegabytes = Math.round(MAX_RESPONSE_BYTES / 1024 / 1024);
  return new FetchError(
    "TOO_LARGE",
    url,
    `Response from "${safeHostname(url)}" exceeds the ${maxMegabytes}MB size limit.`,
  );
}

function classifyFetchError(err: unknown, url: string): FetchError {
  if (err instanceof FetchError) return err;

  const msg = err instanceof Error ? err.message : String(err);
  const cause =
    err instanceof Error && err.cause instanceof Error ? err.cause.message : "";
  const combined = `${msg} ${cause}`.toLowerCase();
  const hostname = safeHostname(url);

  if (isAbort(err, combined)) {
    return new FetchError(
      "TIMEOUT",
      url,
      `Request timed out. The server at "${hostname}" did not respond in time.`,
    );
  }

  if (combined.includes("getaddrinfo") || combined.includes("enotfound")) {
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
      `Connection refused by "${hostname}". The server may be down or not accepting connections.`,
    );
  }

  if (isTlsFailure(combined)) {
    return new FetchError(
      "TLS_ERROR",
      url,
      `TLS/SSL error connecting to "${hostname}". The site may have an invalid or expired certificate.`,
    );
  }

  return new FetchError(
    "NETWORK_ERROR",
    url,
    `Network error fetching "${url}": ${msg}`,
  );
}

function isAbort(err: unknown, combinedMessage: string): boolean {
  return (
    err instanceof DOMException ||
    (err instanceof Error && err.name === "AbortError") ||
    combinedMessage.includes("abort")
  );
}

function isTlsFailure(combinedMessage: string): boolean {
  return (
    combinedMessage.includes("cert") ||
    combinedMessage.includes("ssl") ||
    combinedMessage.includes("tls") ||
    combinedMessage.includes("unable to verify")
  );
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
