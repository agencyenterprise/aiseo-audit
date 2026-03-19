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

export const QUOTED_ATTRIBUTION_PATTERNS = [
  /"[^"]{10,}"\s*[-\u2013\u2014]\s*[A-Z][a-z]+/g,
  /"[^"]{10,}",?\s+said\s+[A-Z]/g,
  /"[^"]{10,}",?\s+according\s+to\s+[A-Z]/g,
  /according\s+to\s+[A-Z][a-z]+[^,]*,\s*"[^"]{10,}"/g,
  /\u201c[^\u201d]{10,}\u201d\s*[-\u2013\u2014]\s*[A-Z][a-z]+/g,
  /\u201c[^\u201d]{10,}\u201d,?\s+said\s+[A-Z]/g,
];
