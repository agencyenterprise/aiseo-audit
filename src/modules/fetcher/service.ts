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

  return {
    url: opts.url,
    finalUrl: response.finalUrl || opts.url,
    statusCode: response.status,
    contentType: response.headers["content-type"] ?? null,
    html: response.data,
    fetchTimeMs: Date.now() - start,
  };
}
