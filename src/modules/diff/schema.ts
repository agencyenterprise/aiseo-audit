import { z } from "zod";

export const CategoryDeltaSchema = z.object({
  name: z.string(),
  currentScore: z.number(),
  baselineScore: z.number(),
  maxScore: z.number(),
  delta: z.number(),
  currentPct: z.number().nullable().optional(),
  baselinePct: z.number().nullable().optional(),
});

export const StageDeltaSchema = z.object({
  currentPct: z.number().nullable(),
  baselinePct: z.number().nullable(),
  delta: z.number().nullable(),
});

export const QueryDeltaSchema = z.object({
  query: z.string(),
  currentCoverage: z.number(),
  baselineCoverage: z.number(),
  delta: z.number(),
  regressed: z.boolean(),
});

export const DiffResultSchema = z.object({
  url: z.string(),
  currentScore: z.number(),
  baselineScore: z.number(),
  overallDelta: z.number(),
  currentAnalyzedAt: z.string(),
  baselineAnalyzedAt: z.string(),
  categoryDeltas: z.record(z.string(), CategoryDeltaSchema),
  stageDeltas: z.record(z.string(), StageDeltaSchema).optional(),
  queryDeltas: z.array(QueryDeltaSchema).optional(),
  crossVersion: z.boolean().optional(),
});

export type CategoryDeltaType = z.infer<typeof CategoryDeltaSchema>;
export type StageDeltaType = z.infer<typeof StageDeltaSchema>;
export type QueryDeltaType = z.infer<typeof QueryDeltaSchema>;
export type DiffResultType = z.infer<typeof DiffResultSchema>;
