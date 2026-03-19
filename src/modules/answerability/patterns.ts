export const DEFINITION_PATTERNS = [
  /\bis\s+defined\s+as\b/gi,
  /\brefers?\s+to\b/gi,
  /\bmeans?\s+that\b/gi,
  /\bis\s+a\s+type\s+of\b/gi,
  /\bcan\s+be\s+described\s+as\b/gi,
  /\balso\s+known\s+as\b/gi,
];

export const DIRECT_ANSWER_PATTERNS = [
  /^The\s+\w+\s+is\b/gm,
  /^It\s+is\b/gm,
  /^This\s+is\b/gm,
  /^They\s+are\b/gm,
  /\bsimply\s+put\b/gi,
  /\bin\s+short\b/gi,
];

export const QUESTION_PATTERNS = [
  /what\s+is/gi,
  /what\s+are/gi,
  /how\s+to/gi,
  /how\s+do/gi,
  /why\s+is/gi,
  /why\s+do/gi,
  /when\s+to/gi,
  /where\s+to/gi,
  /which\s+is/gi,
  /who\s+is/gi,
];

export const STEP_PATTERNS = [
  /step\s+\d+/gi,
  /^\s*\d+\.\s+\w/gm,
  /\bfirst(?:ly)?,?\s/gi,
  /\bsecond(?:ly)?,?\s/gi,
  /\bfinally,?\s/gi,
  /\bhow\s+to\b/gi,
];

export const SUMMARY_MARKERS = [
  /\bin\s+summary\b/gi,
  /\bin\s+conclusion\b/gi,
  /\bto\s+summarize\b/gi,
  /\bkey\s+takeaways?\b/gi,
  /\bbottom\s+line\b/gi,
  /\btl;?dr\b/gi,
];

export const QUESTION_HEADING_PATTERN =
  /^(?:what|how|why|when|where|which|who|can|do|does|is|are|should|will)\b/i;
