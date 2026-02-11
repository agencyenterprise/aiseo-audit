import { z } from "zod";

export const CategoryNameSchema = z.enum([
  "contentExtractability",
  "contentStructure",
  "answerability",
  "entityClarity",
  "groundingSignals",
  "authorityContext",
  "readabilityForCompression",
]);

export const FactorStatusSchema = z.enum([
  "good",
  "needs_improvement",
  "critical",
  "neutral",
]);

export const DomainSignalsSchema = z.object({
  robotsTxt: z.string().nullable(),
  llmsTxtExists: z.boolean(),
  llmsFullTxtExists: z.boolean(),
});
export type DomainSignalsType = z.infer<typeof DomainSignalsSchema>;

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

export const CrawlerAccessResultSchema = z.object({
  allowed: z.array(z.string()),
  blocked: z.array(z.string()),
  unknown: z.array(z.string()),
});
export type CrawlerAccessResultType = z.infer<typeof CrawlerAccessResultSchema>;

export const SectionLengthResultSchema = z.object({
  sectionCount: z.number(),
  avgWordsPerSection: z.number(),
  sections: z.array(z.number()),
});
export type SectionLengthResultType = z.infer<typeof SectionLengthResultSchema>;

export const ExtractedEntitiesSchema = z.object({
  people: z.array(z.string()),
  organizations: z.array(z.string()),
  places: z.array(z.string()),
  topics: z.array(z.string()),
});
export type ExtractedEntitiesType = z.infer<typeof ExtractedEntitiesSchema>;

export const FreshnessResultSchema = z.object({
  publishDate: z.string().nullable(),
  modifiedDate: z.string().nullable(),
  ageInMonths: z.number().nullable(),
  hasModifiedDate: z.boolean(),
});
export type FreshnessResultType = z.infer<typeof FreshnessResultSchema>;

export const AuditRawDataSchema = z.object({
  title: z.string(),
  metaDescription: z.string(),
  wordCount: z.number(),
  crawlerAccess: CrawlerAccessResultSchema.optional(),
  sectionLengths: SectionLengthResultSchema.optional(),
  answerCapsules: z
    .object({
      total: z.number(),
      withCapsule: z.number(),
    })
    .optional(),
  entities: ExtractedEntitiesSchema.optional(),
  externalLinks: z
    .array(
      z.object({
        url: z.string(),
        text: z.string(),
      }),
    )
    .optional(),
  structuredDataTypes: z.array(z.string()).optional(),
  freshness: FreshnessResultSchema.optional(),
  questionsFound: z.array(z.string()).optional(),
  avgSentenceLength: z.number().optional(),
  readabilityScore: z.number().optional(),
  imageAccessibility: z
    .object({
      imageCount: z.number(),
      imagesWithAlt: z.number(),
      figcaptionCount: z.number(),
    })
    .optional(),
  schemaCompleteness: z
    .object({
      totalTypes: z.number(),
      avgCompleteness: z.number(),
      details: z.array(
        z.object({
          type: z.string(),
          present: z.array(z.string()),
          missing: z.array(z.string()),
        }),
      ),
    })
    .optional(),
  entityConsistency: z
    .object({
      entityName: z.string().nullable(),
      surfacesFound: z.number(),
      surfacesChecked: z.number(),
    })
    .optional(),
});

export type AuditRawDataType = z.infer<typeof AuditRawDataSchema>;

export interface CategoryAuditOutput {
  category: CategoryResultType;
  rawData: Partial<AuditRawDataType>;
}

export const AuditResultSchema = z.object({
  categories: z.record(CategoryNameSchema, CategoryResultSchema),
  rawData: AuditRawDataSchema,
});

export type CategoryNameType = z.infer<typeof CategoryNameSchema>;
export type FactorStatusType = z.infer<typeof FactorStatusSchema>;
export type FactorResultType = z.infer<typeof FactorResultSchema>;
export type CategoryResultType = z.infer<typeof CategoryResultSchema>;
export type AuditResultType = z.infer<typeof AuditResultSchema>;
