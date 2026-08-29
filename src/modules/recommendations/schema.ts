import { z } from "zod";
import { EvidenceTierSchema } from "../audits/schema.js";

export const RecommendationDirectionSchema = z.enum([
  "simplify",
  "deepen",
  "shorten",
  "expand",
  "add",
  "remove",
]);

export const RecommendationSchema = z.object({
  category: z.string(),
  factor: z.string(),
  currentValue: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  recommendation: z.string(),
  auditPoints: z.number().min(0).optional(),
  evidence: EvidenceTierSchema.optional(),
  citations: z.array(z.string()).optional(),
  direction: RecommendationDirectionSchema.optional(),
  steps: z.array(z.string()).optional(),
  codeExample: z.string().optional(),
  learnMoreUrl: z.string().url().optional(),
});

export type RecommendationDirectionType = z.infer<
  typeof RecommendationDirectionSchema
>;
export type RecommendationType = z.infer<typeof RecommendationSchema>;
