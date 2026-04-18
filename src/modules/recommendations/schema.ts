import { z } from "zod";

export const RecommendationSchema = z.object({
  category: z.string(),
  factor: z.string(),
  currentValue: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  recommendation: z.string(),
  expectedGain: z.number().min(0).optional(),
  steps: z.array(z.string()).optional(),
  codeExample: z.string().optional(),
  learnMoreUrl: z.string().url().optional(),
});

export type RecommendationType = z.infer<typeof RecommendationSchema>;
