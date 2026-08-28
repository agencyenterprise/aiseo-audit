import { z } from "zod";
import { VERSION } from "../../version.js";

export const FetchOptionsSchema = z.object({
  url: z.url(),
  timeout: z.number().positive().default(45000),
  userAgent: z.string().default(`AISEOAudit/${VERSION}`),
});

export type FetchOptionsType = z.input<typeof FetchOptionsSchema>;

export type FetchResultType = {
  url: string;
  finalUrl: string;
  statusCode: number;
  contentType: string | null;
  html: string;
  fetchTimeMs: number;
};
