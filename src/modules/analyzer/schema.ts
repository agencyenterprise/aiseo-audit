import { z } from "zod";
import { AuditRawDataSchema, CategoryResultSchema } from "../audits/schema.js";
import { CategoryWeightSchema } from "../config/schema.js";
import { RecommendationSchema } from "../recommendations/schema.js";

export type AnalyzerOptionsType = {
  url: string;
  signalsBase?: string;
  timeout?: number;
  userAgent?: string;
};

export const AnalyzerResultSchema = z.object({
  url: z.string(),
  signalsBase: z.string(),
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
    weights: CategoryWeightSchema.optional(),
    analysisDurationMs: z.number(),
  }),
});

export type AnalyzerResultType = z.infer<typeof AnalyzerResultSchema>;
