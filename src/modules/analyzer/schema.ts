import { z } from "zod";
import { AuditRawDataSchema, CategoryResultSchema } from "../audits/schema.js";
import {
  CategoryWeightSchema,
  DomainOptionSchema,
  EngineProfileSchema,
  StageWeightSchema,
} from "../config/schema.js";
import { RecommendationSchema } from "../recommendations/schema.js";
import { StageScoresSchema } from "../scoring/schema.js";

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
  schemaVersion: z.number().int().optional(),
  overallScore: z.number(),
  grade: z.string(),
  totalPoints: z.number(),
  maxPoints: z.number(),
  stages: StageScoresSchema.optional(),
  categories: z.record(z.string(), CategoryResultSchema),
  recommendations: z.array(RecommendationSchema),
  rawData: AuditRawDataSchema,
  meta: z.object({
    version: z.string(),
    weights: CategoryWeightSchema.optional(),
    stageWeights: StageWeightSchema.optional(),
    queries: z.array(z.string()).optional(),
    domain: DomainOptionSchema.optional(),
    engine: EngineProfileSchema.optional(),
    analysisDurationMs: z.number(),
  }),
});

export type AnalyzerResultType = z.infer<typeof AnalyzerResultSchema>;
