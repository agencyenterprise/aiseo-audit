import { z } from "zod";
import { VERSION } from "../analyzer/constants.js";

export const FetchOptionsSchema = z.object({
  url: z.url(),
  timeout: z.number().positive().default(45000),
  userAgent: z.string().default(`AISEOAudit/${VERSION}`),
});

export const FetchResultSchema = z.object({
  url: z.string(),
  finalUrl: z.string(),
  statusCode: z.number(),
  contentType: z.string(),
  html: z.string(),
  byteLength: z.number(),
  fetchTimeMs: z.number(),
  redirected: z.boolean(),
});

export type FetchOptionsType = z.infer<typeof FetchOptionsSchema>;
export type FetchResultType = z.infer<typeof FetchResultSchema>;
