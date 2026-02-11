export const DEFINITION_PATTERNS = [
  /\bis\s+defined\s+as\b/gi,
  /\brefers?\s+to\b/gi,
  /\bmeans?\s+that\b/gi,
  /\bis\s+a\s+type\s+of\b/gi,
  /\bcan\s+be\s+described\s+as\b/gi,
  /\balso\s+known\s+as\b/gi,
];

export const CITATION_PATTERNS = [
  /\[\d+\]/g,
  /\([\w\s]+,?\s*\d{4}\)/g,
  /according\s+to/gi,
  /research\s+(?:shows|indicates|suggests)/gi,
  /studies?\s+(?:show|indicate|suggest|found)/gi,
  /data\s+from/gi,
  /as\s+reported\s+by/gi,
];

export const ATTRIBUTION_PATTERNS = [
  /according\s+to/gi,
  /\bsaid\b/gi,
  /\bstated\b/gi,
  /\breported\b/gi,
  /\bcited\s+by\b/gi,
];

export const NUMERIC_CLAIM_PATTERNS = [
  /\d+(?:\.\d+)?\s*%/g,
  /\d+(?:\.\d+)?\s*(?:million|billion|thousand|trillion)/gi,
  /\$[\d,.]+/g,
  /increased\s+by/gi,
  /decreased\s+by/gi,
  /grew\s+by/gi,
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

export const DIRECT_ANSWER_PATTERNS = [
  /^The\s+\w+\s+is\b/gm,
  /^It\s+is\b/gm,
  /^This\s+is\b/gm,
  /^They\s+are\b/gm,
  /\bsimply\s+put\b/gi,
  /\bin\s+short\b/gi,
];

export const TRANSITION_WORDS = [
  'however', 'therefore', 'moreover', 'furthermore', 'consequently',
  'additionally', 'in contrast', 'similarly', 'as a result', 'for example',
  'for instance', 'on the other hand', 'nevertheless', 'meanwhile',
  'likewise', 'in addition', 'specifically', 'in particular', 'notably',
  'importantly',
];

export const AUTHOR_SELECTORS = [
  '[rel="author"]',
  '.author',
  '.byline',
  '[itemprop="author"]',
  '.post-author',
  '.entry-author',
  'meta[name="author"]',
];

export const DATE_SELECTORS = [
  'time[datetime]',
  '[itemprop="datePublished"]',
  '[itemprop="dateModified"]',
  '.published',
  '.post-date',
  '.entry-date',
  'meta[property="article:published_time"]',
  'meta[property="article:modified_time"]',
];

export const CREDENTIAL_TERMS = [
  'expert', 'specialist', 'certified', 'professional',
  'years of experience', 'phd', 'doctor', 'professor',
  'degree', 'qualification', 'researcher',
];

export const FAQ_INDICATORS = [
  'faq', 'frequently asked', 'common questions', 'q&a',
];

export const QUESTION_HEADING_PATTERN = /^(?:what|how|why|when|where|which|who|can|do|does|is|are|should|will)\b/i;

export const QUOTED_ATTRIBUTION_PATTERNS = [
  /"[^"]{10,}"\s*[-\u2013\u2014]\s*[A-Z][a-z]+/g,
  /"[^"]{10,}",?\s+said\s+[A-Z]/g,
  /"[^"]{10,}",?\s+according\s+to\s+[A-Z]/g,
  /according\s+to\s+[A-Z][a-z]+[^,]*,\s*"[^"]{10,}"/g,
  /\u201c[^\u201d]{10,}\u201d\s*[-\u2013\u2014]\s*[A-Z][a-z]+/g,
  /\u201c[^\u201d]{10,}\u201d,?\s+said\s+[A-Z]/g,
];

export const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
];

export const MODIFIED_DATE_SELECTORS = [
  '[itemprop="dateModified"]',
  'meta[property="article:modified_time"]',
];

export const PUBLISH_DATE_SELECTORS = [
  'time[datetime]',
  '[itemprop="datePublished"]',
  'meta[property="article:published_time"]',
];
