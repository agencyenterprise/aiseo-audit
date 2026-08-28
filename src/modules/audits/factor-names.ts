import type { CategoryNameType } from "./schema.js";

export const FACTOR_NAMES_BY_CATEGORY = {
  contentExtractability: [
    "Fetch Success",
    "Text Extraction Quality",
    "Boilerplate Ratio",
    "Word Count Adequacy",
    "AI Crawler Access",
    "LLMs.txt Presence",
    "Image Accessibility",
  ],
  contentStructure: [
    "Heading Hierarchy",
    "Lists Presence",
    "Tables Presence",
    "Paragraph Structure",
    "Scannability",
    "Section Length",
  ],
  answerability: [
    "Definition Patterns",
    "Direct Answer Statements",
    "Answer Capsules",
    "Step-by-Step Content",
    "Q/A Patterns",
    "Summary/Conclusion",
  ],
  entityClarity: ["Entity Richness", "Topic Consistency", "Entity Density"],
  groundingSignals: [
    "External References",
    "Citation Patterns",
    "Numeric Claims",
    "Attribution Indicators",
    "Quoted Attribution",
  ],
  authorityContext: [
    "Author Attribution",
    "Organization Identity",
    "Contact/About Links",
    "Publication Date",
    "Content Freshness",
    "Structured Data",
    "Schema Completeness",
    "Entity Consistency",
  ],
  readabilityForCompression: [
    "Sentence Length",
    "Readability",
    "Jargon Density",
    "Transition Usage",
  ],
} as const satisfies Record<CategoryNameType, readonly string[]>;

export type FactorNameType =
  (typeof FACTOR_NAMES_BY_CATEGORY)[CategoryNameType][number];
