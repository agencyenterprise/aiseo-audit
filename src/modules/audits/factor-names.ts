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
    "Paywall Signals",
  ],
  structuralAlignment: [
    "Title Entity Alignment",
    "Meta Description Alignment",
    "Heading Entity Alignment",
    "Structured Data Alignment",
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
    "Lead Summary",
    "Definition Patterns",
    "Direct Answer Statements",
    "Answer Capsules",
    "Step-by-Step Content",
    "Q/A Patterns",
    "Summary/Conclusion",
    "Explanatory Depth",
  ],
  queryAlignment: [
    "Query Term Coverage (Structural)",
    "Query Term Coverage (Body)",
    "Query Aspect Coverage",
  ],
  entityClarity: [
    "Entity Richness",
    "Topic Consistency",
    "Term Repetition Balance",
    "Pronoun Ambiguity",
  ],
  groundingSignals: [
    "External References",
    "Citation Patterns",
    "Numeric Claims",
    "Attribution Indicators",
    "Quoted Attribution",
    "Hedged Language",
  ],
  authorityContext: [
    "Author Attribution",
    "Organization Identity",
    "Contact/About Links",
    "Date Markup",
    "Content Freshness",
    "Topic Time Sensitivity",
    "Structured Data",
    "Schema Completeness",
    "Entity Consistency",
    "Promotional Language",
    "Affiliate Link Density",
    "Ad Slot Markers",
    "Site Type",
  ],
  productFit: [
    "Price Presence",
    "Technical Specifications",
    "Comparison Content",
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
