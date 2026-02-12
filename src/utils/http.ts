import {
  DEFAULT_HEADERS,
  MAX_RESPONSE_SIZE,
} from "../modules/fetcher/constants.js";

// todo: use zod schema for this and z.infer type instead of interfaces.
interface HttpRequestOptions {
  url: string;
  timeout: number;
  userAgent: string;
}

export interface HttpResponse {
  status: number;
  data: string;
  headers: Record<string, string>;
  finalUrl: string;
}

export async function httpGet(
  options: HttpRequestOptions,
): Promise<HttpResponse> {
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
      throw new Error(
        `Response exceeds maximum size of ${MAX_RESPONSE_SIZE} bytes`,
      );
    }

    const data = await response.text();

    if (data.length > MAX_RESPONSE_SIZE) {
      throw new Error(
        `Response exceeds maximum size of ${MAX_RESPONSE_SIZE} bytes`,
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
  } finally {
    clearTimeout(timer);
  }
}

export async function httpHead(
  options: HttpRequestOptions,
): Promise<HttpResponse> {
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
  } finally {
    clearTimeout(timer);
  }
}
