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

export type BracketType = z.infer<typeof BracketSchema>;
export type RangeBracketType = z.infer<typeof RangeBracketSchema>;
export type ThresholdType = z.infer<typeof ThresholdTypeSchema>;
export type GradeType = z.infer<typeof GradeSchema>;
export type ScoreSummaryType = z.infer<typeof ScoreSummarySchema>;
