const SENTENCE_START = /(?:^|[.!?]\s+)/.source;

export const DEFINITION_PATTERNS = [
  /\bis\s+defined\s+as\b/gi,
  /\brefers?\s+to\b/gi,
  /\bmeans?\s+that\b/gi,
  /\bis\s+a\s+type\s+of\b/gi,
  /\bcan\s+be\s+described\s+as\b/gi,
  /\balso\s+known\s+as\b/gi,
];

export const DIRECT_ANSWER_PATTERNS = [
  new RegExp(`${SENTENCE_START}The\\s+\\w+\\s+is\\b`, "g"),
  new RegExp(`${SENTENCE_START}It\\s+is\\b`, "g"),
  new RegExp(`${SENTENCE_START}This\\s+is\\b`, "g"),
  new RegExp(`${SENTENCE_START}They\\s+are\\b`, "g"),
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

const NUMBERED_STEP_BUT_NOT_DECIMAL = /(?:^|\s)\d{1,2}\.\s+[A-Za-z]/g;

export const STEP_PATTERNS = [
  /step\s+\d+/gi,
  NUMBERED_STEP_BUT_NOT_DECIMAL,
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
