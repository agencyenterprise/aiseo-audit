import { z } from 'zod';
import type { CategoryResult } from '../audits/schema.js';
import type { Recommendation } from '../recommendations/schema.js';

export const AnalyzerOptionsSchema = z.object({
  url: z.string(),
  timeout: z.number().positive().default(45000),
  userAgent: z.string().default('GEOAudit/0.1.0'),
});

export interface AnalyzerResult {
  url: string;
  analyzedAt: string;
  overallScore: number;
  grade: string;
  totalPoints: number;
  maxPoints: number;
  categories: Record<string, CategoryResult>;
  recommendations: Recommendation[];
  rawData: Record<string, unknown>;
  meta: {
    version: string;
    analysisDurationMs: number;
  };
}

export type AnalyzerOptions = z.infer<typeof AnalyzerOptionsSchema>;
