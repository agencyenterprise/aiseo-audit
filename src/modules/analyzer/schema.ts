import { z } from "zod";
import { AuditRawDataSchema, CategoryResultSchema } from "../audits/schema.js";
import { RecommendationSchema } from "../recommendations/schema.js";

export const AnalyzerOptionsSchema = z.object({
  url: z.string(),
  timeout: z.number().positive().default(45000),
  userAgent: z.string().default("GEOAudit/0.1.0"),
});

export const AnalyzerResultSchema = z.object({
  url: z.string(),
  analyzedAt: z.string(),
  overallScore: z.number(),
  grade: z.string(),
  totalPoints: z.number(),
  maxPoints: z.number(),
  categories: z.record(z.string(), CategoryResultSchema),
  recommendations: z.array(RecommendationSchema),
  rawData: AuditRawDataSchema,
  meta: z.object({
    version: z.string(),
    analysisDurationMs: z.number(),
  }),
});

export type AnalyzerOptionsType = z.infer<typeof AnalyzerOptionsSchema>;
export type AnalyzerResultType = z.infer<typeof AnalyzerResultSchema>;
