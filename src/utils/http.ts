import {
  DEFAULT_HEADERS,
  MAX_RESPONSE_SIZE,
} from "../modules/fetcher/constants.js";
import type { HttpRequestOptionsType, HttpResponseType } from "./schema.js";

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
  } finally {
    clearTimeout(timer);
  }
}
