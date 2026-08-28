import { z } from "zod";
import { VERSION } from "../../version.js";
import { CategoryNameSchema, type CategoryNameType } from "../audits/schema.js";

const DEFAULT_USER_AGENT = `AISEOAudit/${VERSION}`;

export const DEFAULT_WEIGHTS = Object.fromEntries(
  CategoryNameSchema.options.map((key) => [key, 1]),
) as Record<CategoryNameType, number>;

const weightShape = Object.fromEntries(
  CategoryNameSchema.options.map((key) => [key, z.number().min(0).default(1)]),
) as Record<CategoryNameType, z.ZodDefault<z.ZodNumber>>;

export const CategoryWeightSchema = z
  .object(weightShape)
  .default(DEFAULT_WEIGHTS);

export const DiffEntrySchema = z.object({
  path: z.string(),
  timestamp: z.string(),
  score: z.number().min(0).max(100),
});

export const AiseoConfigSchema = z.object({
  timeout: z.number().positive().default(45000),
  userAgent: z.string().default(DEFAULT_USER_AGENT),
  format: z.enum(["pretty", "json", "md", "html"]).default("pretty"),
  failUnder: z.number().min(0).max(100).optional(),
  weights: CategoryWeightSchema,
  historyDir: z.string().default("./audits"),
  diff: z.record(z.string(), z.array(DiffEntrySchema)).optional(),
});

export type CategoryWeightType = z.infer<typeof CategoryWeightSchema>;
export type DiffEntryType = z.infer<typeof DiffEntrySchema>;
export type AiseoConfigType = z.infer<typeof AiseoConfigSchema>;
