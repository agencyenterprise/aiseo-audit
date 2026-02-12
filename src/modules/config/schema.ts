import { z } from "zod";
import { VERSION } from "../analyzer/constants.js";

const DEFAULT_USER_AGENT = `GEOAudit/${VERSION}`;

const DEFAULT_WEIGHTS = {
  contentExtractability: 1,
  contentStructure: 1,
  answerability: 1,
  entityClarity: 1,
  groundingSignals: 1,
  authorityContext: 1,
  readabilityForCompression: 1,
} as const;

export const CategoryWeightSchema = z
  .object({
    contentExtractability: z.number().min(0).default(1),
    contentStructure: z.number().min(0).default(1),
    answerability: z.number().min(0).default(1),
    entityClarity: z.number().min(0).default(1),
    groundingSignals: z.number().min(0).default(1),
    authorityContext: z.number().min(0).default(1),
    readabilityForCompression: z.number().min(0).default(1),
  })
  .default(DEFAULT_WEIGHTS);

export const GeoJsonConfigSchema = z
  .object({
    timeout: z.number().positive().default(45000),
    userAgent: z.string().default(DEFAULT_USER_AGENT),
    format: z.enum(["pretty", "json", "md", "html"]).default("pretty"),
    failUnder: z.number().min(0).max(100).optional(),
    weights: CategoryWeightSchema,
  })
  .default({
    timeout: 45000,
    userAgent: DEFAULT_USER_AGENT,
    format: "pretty" as const,
    weights: DEFAULT_WEIGHTS,
  });

export type CategoryWeightType = z.infer<typeof CategoryWeightSchema>;
export type GeoJsonConfigType = z.infer<typeof GeoJsonConfigSchema>;
