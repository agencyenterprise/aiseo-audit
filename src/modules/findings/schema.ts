import { z } from "zod";
import { EvidenceTierSchema, FactorStatusSchema } from "../audits/schema.js";
import { StageNameSchema } from "../audits/stage.js";

export const FindingLocationSchema = z.object({
  url: z.string(),
  scope: z.enum(["element", "document", "network"]),
  selector: z.string().optional(),
  excerpt: z.string().optional(),
});

export const FindingSchema = z.object({
  schemaVersion: z.literal(1),
  ruleId: z.string(),
  fingerprint: z.string(),
  factor: z.string(),
  category: z.string(),
  stage: StageNameSchema,
  status: FactorStatusSchema,
  severity: z.enum(["error", "warning", "notice", "none"]),
  scored: z.boolean(),
  evidence: EvidenceTierSchema,
  measured: z.string(),
  expected: z
    .object({ status: z.literal("good"), minimumScore: z.number() })
    .optional(),
  location: FindingLocationSchema,
  message: z.string(),
  steps: z.array(z.string()),
  citations: z.array(z.string()),
  documentationUrl: z.string(),
});

export type FindingType = z.infer<typeof FindingSchema>;
export type FindingLocationType = z.infer<typeof FindingLocationSchema>;
