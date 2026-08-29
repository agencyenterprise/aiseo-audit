import type { CategoryNameType } from "./schema.js";

export const CATEGORY_DISPLAY_NAMES: Record<CategoryNameType, string> = {
  contentExtractability: "Content Extractability",
  structuralAlignment: "Structural Alignment",
  contentStructure: "Content Structure for Reuse",
  answerability: "Answerability",
  queryAlignment: "Query Alignment",
  entityClarity: "Entity Clarity",
  groundingSignals: "Grounding Signals",
  authorityContext: "Authority Context",
  productFit: "Product Fit",
  readabilityForCompression: "Readability for Compression",
};
