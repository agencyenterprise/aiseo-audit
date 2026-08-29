import { z } from "zod";
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

export const HostProfileSchema = z.object({
  dominantSiteName: z.string().nullable(),
  siteNameUniformityPct: z.number(),
  organizationSchemaPct: z.number(),
  bylineCoveragePct: z.number(),
  aboutOrContactFound: z.boolean(),
  note: z.string(),
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
  hostProfile: HostProfileSchema.optional(),
  urlResults: z.array(SitemapUrlResultSchema),
  warnings: z.array(z.string()),
  meta: z.object({
    version: z.string(),
    analysisDurationMs: z.number(),
  }),
});

export type SitemapOptionsType = {
  sitemapUrl: string;
  signalsBase?: string;
  timeout?: number;
  userAgent?: string;
};

export type SitemapUrlResultType = z.infer<typeof SitemapUrlResultSchema>;
export type CategoryAverageType = z.infer<typeof CategoryAverageSchema>;
export type HostProfileType = z.infer<typeof HostProfileSchema>;
export type SitemapResultType = z.infer<typeof SitemapResultSchema>;

export type SitemapSuccessResultType = Extract<
  SitemapUrlResultType,
  { status: "success" }
>;

export function isSuccessResult(
  result: SitemapUrlResultType,
): result is SitemapSuccessResultType {
  return result.status === "success";
}
