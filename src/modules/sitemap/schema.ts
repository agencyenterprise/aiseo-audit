import { z } from "zod";
import { VERSION } from "../analyzer/constants.js";
import { AnalyzerResultSchema } from "../analyzer/schema.js";

export const SitemapUrlResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("success"),
    result: AnalyzerResultSchema,
  }),
  z.object({
    status: z.literal("failed"),
    url: z.string(),
    error: z.string(),
  }),
]);

export const CategoryAverageSchema = z.object({
  name: z.string(),
  averagePct: z.number(),
});

export const SitemapResultSchema = z.object({
  sitemapUrl: z.string(),
  signalsBase: z.string(),
  analyzedAt: z.string(),
  totalUrls: z.number(),
  succeededCount: z.number(),
  failedCount: z.number(),
  averageScore: z.number(),
  averageGrade: z.string(),
  categoryAverages: z.record(z.string(), CategoryAverageSchema),
  urlResults: z.array(SitemapUrlResultSchema),
  meta: z.object({
    version: z.string(),
    analysisDurationMs: z.number(),
  }),
});

export const SitemapOptionsSchema = z.object({
  sitemapUrl: z.string(),
  signalsBase: z.string().optional(),
  timeout: z.number().positive().default(45000),
  userAgent: z.string().default(`AISEOAudit/${VERSION}`),
});

export type SitemapUrlResultType = z.infer<typeof SitemapUrlResultSchema>;
export type CategoryAverageType = z.infer<typeof CategoryAverageSchema>;
export type SitemapResultType = z.infer<typeof SitemapResultSchema>;
export type SitemapOptionsType = z.input<typeof SitemapOptionsSchema>;
