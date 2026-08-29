import { z } from "zod";

export const BracketSchema = z.tuple([z.number(), z.number()]);

export const RangeBracketSchema = z.tuple([z.number(), z.number(), z.number()]);

export const ThresholdTypeSchema = z.enum(["higher", "lower", "range"]);

export const GradeSchema = z.enum([
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
]);

export const ScoreSummarySchema = z.object({
  overallScore: z.number().min(0).max(100),
  grade: GradeSchema,
  totalPoints: z.number(),
  maxPoints: z.number(),
});

export const StageScoreSchema = z.object({
  score: z.number(),
  maxScore: z.number(),
  pct: z.number().nullable(),
  suppressed: z.boolean(),
});

export const GateResultSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["pass", "tripped", "not_applicable"]),
  capPct: z.number(),
  citations: z.array(z.string()),
});

export const StageScoresSchema = z.object({
  technicalEligibility: StageScoreSchema.extend({
    status: z.enum(["pass", "fail"]),
    blockers: z.array(z.string()),
  }),
  retrievalAlignment: StageScoreSchema,
  citationFitness: StageScoreSchema.extend({
    uncappedPct: z.number().nullable(),
    gates: z.array(GateResultSchema),
  }),
  provenance: StageScoreSchema,
});

export type BracketType = z.infer<typeof BracketSchema>;
export type RangeBracketType = z.infer<typeof RangeBracketSchema>;
export type ThresholdType = z.infer<typeof ThresholdTypeSchema>;
export type GradeType = z.infer<typeof GradeSchema>;
export type ScoreSummaryType = z.infer<typeof ScoreSummarySchema>;
export type StageScoreType = z.infer<typeof StageScoreSchema>;
export type GateResultType = z.infer<typeof GateResultSchema>;
export type StageScoresType = z.infer<typeof StageScoresSchema>;
