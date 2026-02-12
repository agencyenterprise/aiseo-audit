import { z } from "zod";

export const FetchOptionsSchema = z.object({
  url: z.string().url(),
  timeout: z.number().positive().default(45000),
  userAgent: z.string().default("GEOAudit/0.1.0"),
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
