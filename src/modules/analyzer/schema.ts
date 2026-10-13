import { z } from "zod";
import {
  AuditRawDataSchema,
  CategoryResultSchema,
  DomainSignalsSchema,
  type DomainSignalsType,
} from "../audits/schema.js";
import {
  CategoryWeightSchema,
  DomainOptionSchema,
  EngineProfileSchema,
  StageWeightSchema,
  AiseoConfigSchema,
} from "../config/schema.js";
import { RecommendationSchema } from "../recommendations/schema.js";
import { StageScoresSchema } from "../scoring/schema.js";
import { FindingSchema } from "../findings/schema.js";

export type AnalyzerOptionsType = {
  url: string;
  signalsBase?: string;
  timeout?: number;
  userAgent?: string;
  evaluationDate?: string;
  signal?: AbortSignal;
};

export type HtmlAnalyzerOptionsType = {
  html: string;
  url: string;
  headers?: Record<string, string>;
  domainSignals?: DomainSignalsType;
  evaluationDate?: string;
};

export const AuditSnapshotSchema = z.object({
  snapshotVersion: z.literal(1),
  scoringVersion: z.string(),
  url: z.string().url(),
  evaluationDate: z.string(),
  fetchResult: z.object({
    url: z.string(),
    finalUrl: z.string(),
    html: z.string(),
    statusCode: z.number().int(),
    contentType: z.string().nullable(),
    fetchTimeMs: z.number(),
    source: z.enum(["network", "html"]).optional(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
  domainSignals: DomainSignalsSchema,
  config: AiseoConfigSchema,
});

export type AuditSnapshotType = z.infer<typeof AuditSnapshotSchema>;

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
  warnings: z.array(z.string()).optional(),
  findings: z.array(FindingSchema).optional(),
  meta: z.object({
    version: z.string(),
    weights: CategoryWeightSchema.optional(),
    stageWeights: StageWeightSchema.optional(),
    queries: z.array(z.string()).optional(),
    domain: DomainOptionSchema.optional(),
    engine: EngineProfileSchema.optional(),
    analysisDurationMs: z.number(),
    scoringVersion: z.string().optional(),
    evaluationDate: z.string().optional(),
    inputFingerprint: z.string().optional(),
    configurationFingerprint: z.string().optional(),
    effectiveWeights: CategoryWeightSchema.optional(),
    source: z.enum(["network", "html"]).optional(),
    finalUrl: z.string().optional(),
  }),
});

export type AnalyzerResultType = z.infer<typeof AnalyzerResultSchema>;
