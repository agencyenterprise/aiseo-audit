import axios from "axios";
import { DEFAULT_HEADERS, MAX_RESPONSE_SIZE } from "./constants.js";
import {
  FetchOptionsSchema,
  type FetchOptionsType,
  type FetchResultType,
} from "./schema.js";

export async function fetchUrl(
  options: FetchOptionsType,
): Promise<FetchResultType> {
  const opts = FetchOptionsSchema.parse(options);
  const start = Date.now();

  const response = await axios.get(opts.url, {
    headers: {
      "User-Agent": opts.userAgent,
      ...DEFAULT_HEADERS,
    },
    timeout: opts.timeout,
    maxRedirects: 5,
    responseType: "text",
    maxContentLength: MAX_RESPONSE_SIZE,
    validateStatus: (status) => status < 500,
  });

  const fetchTimeMs = Date.now() - start;
  const html =
    typeof response.data === "string" ? response.data : String(response.data);
  const finalUrl = response.request?.res?.responseUrl || opts.url;
  const contentType = response.headers["content-type"] || "unknown";

  if (response.status >= 400) {
    throw new Error(`HTTP ${response.status}: Page returned an error`);
  }

  return {
    url: opts.url,
    finalUrl,
    statusCode: response.status,
    contentType,
    html,
    byteLength: Buffer.byteLength(html, "utf-8"),
    fetchTimeMs,
    redirected: finalUrl !== opts.url,
  };
}
