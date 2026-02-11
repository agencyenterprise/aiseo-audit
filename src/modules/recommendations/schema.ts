import { z } from "zod";

export const RecommendationSchema = z.object({
  category: z.string(),
  factor: z.string(),
  currentValue: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  recommendation: z.string(),
});

export type RecommendationType = z.infer<typeof RecommendationSchema>;
