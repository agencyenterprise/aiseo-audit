import { z } from "zod";

export const CategoryDeltaSchema = z.object({
  name: z.string(),
  currentScore: z.number(),
  baselineScore: z.number(),
  maxScore: z.number(),
  delta: z.number(),
});

export const DiffResultSchema = z.object({
  url: z.string(),
  currentScore: z.number(),
  baselineScore: z.number(),
  overallDelta: z.number(),
  currentAnalyzedAt: z.string(),
  baselineAnalyzedAt: z.string(),
  categoryDeltas: z.record(z.string(), CategoryDeltaSchema),
});

export type CategoryDeltaType = z.infer<typeof CategoryDeltaSchema>;
export type DiffResultType = z.infer<typeof DiffResultSchema>;
