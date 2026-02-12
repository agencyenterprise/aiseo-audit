import type { CategoryNameType } from "./schema.js";

export const CATEGORY_DISPLAY_NAMES: Record<CategoryNameType, string> = {
  contentExtractability: "Content Extractability",
  contentStructure: "Content Structure for Reuse",
  answerability: "Answerability",
  entityClarity: "Entity Clarity",
  groundingSignals: "Grounding Signals",
  authorityContext: "Authority Context",
  readabilityForCompression: "Readability for Compression",
};
