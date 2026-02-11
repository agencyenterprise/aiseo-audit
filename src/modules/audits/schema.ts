import { z } from 'zod';

export const CategoryNameSchema = z.enum([
  'contentExtractability',
  'contentStructure',
  'answerability',
  'entityClarity',
  'groundingSignals',
  'authorityContext',
  'readabilityForCompression',
]);

export const FactorStatusSchema = z.enum([
  'good',
  'needs_improvement',
  'critical',
  'neutral',
]);

export const FactorResultSchema = z.object({
  name: z.string(),
  score: z.number().min(0),
  maxScore: z.number().min(0),
  value: z.string(),
  status: FactorStatusSchema,
});

export const CategoryResultSchema = z.object({
  name: z.string(),
  key: CategoryNameSchema,
  score: z.number().min(0),
  maxScore: z.number(),
  factors: z.array(FactorResultSchema),
});

export const AuditResultSchema = z.object({
  categories: z.record(CategoryNameSchema, CategoryResultSchema),
  rawData: z.record(z.unknown()),
});

export type CategoryName = z.infer<typeof CategoryNameSchema>;
export type FactorStatus = z.infer<typeof FactorStatusSchema>;
export type FactorResult = z.infer<typeof FactorResultSchema>;
export type CategoryResult = z.infer<typeof CategoryResultSchema>;
export type AuditResult = z.infer<typeof AuditResultSchema>;
