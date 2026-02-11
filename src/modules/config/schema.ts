import { z } from "zod";

export const CategoryWeightSchema = z
  .object({
    contentExtractability: z.number().min(0).max(1).default(1),
    contentStructure: z.number().min(0).max(1).default(1),
    answerability: z.number().min(0).max(1).default(1),
    entityClarity: z.number().min(0).max(1).default(1),
    groundingSignals: z.number().min(0).max(1).default(1),
    authorityContext: z.number().min(0).max(1).default(1),
    readabilityForCompression: z.number().min(0).max(1).default(1),
  })
  .default({});

export const GeoJsonConfigSchema = z
  .object({
    timeout: z.number().positive().default(45000),
    userAgent: z.string().default("GEOAudit/0.1.0"),
    format: z.enum(["pretty", "json", "md"]).default("pretty"),
    failUnder: z.number().min(0).max(100).optional(),
    weights: CategoryWeightSchema,
  })
  .default({});

export type CategoryWeight = z.infer<typeof CategoryWeightSchema>;
export type GeoJsonConfig = z.infer<typeof GeoJsonConfigSchema>;
