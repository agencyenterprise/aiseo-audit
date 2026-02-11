import type { CategoryName } from './schema.js';

export const CATEGORY_DISPLAY_NAMES: Record<CategoryName, string> = {
  contentExtractability: 'Content Extractability',
  contentStructure: 'Content Structure for Reuse',
  answerability: 'Answerability',
  entityClarity: 'Entity Clarity',
  groundingSignals: 'Grounding Signals',
  authorityContext: 'Authority Context',
  readabilityForCompression: 'Readability for Compression',
};

export const CATEGORY_MAX_SCORE = 100;
