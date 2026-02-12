import { z } from "zod";

export const GradeSchema = z.enum([
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D",
  "F",
]);

export const ScoreSummarySchema = z.object({
  overallScore: z.number().min(0).max(100),
  grade: GradeSchema,
  totalPoints: z.number(),
  maxPoints: z.number(),
});

export type GradeType = z.infer<typeof GradeSchema>;
export type ScoreSummaryType = z.infer<typeof ScoreSummarySchema>;
