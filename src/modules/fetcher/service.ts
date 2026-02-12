import { httpGet } from "../../utils/http.js";
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

  const response = await httpGet({
    url: opts.url,
    timeout: opts.timeout,
    userAgent: opts.userAgent,
  });

  const fetchTimeMs = Date.now() - start;
  const html = response.data;
  const finalUrl = response.finalUrl || opts.url;
  const contentType = response.headers["content-type"] || "unknown";

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
