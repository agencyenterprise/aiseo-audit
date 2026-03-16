import compromise from "compromise";
import { countSyllables } from "../../../utils/strings.js";
import type { ExtractedEntitiesType } from "../schema.js";

// ── Stopwords for TF-IDF and acronym filtering ──────────────────────────

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "been",
  "be",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "need",
  "must",
  "that",
  "which",
  "who",
  "whom",
  "this",
  "these",
  "those",
  "it",
  "its",
  "he",
  "she",
  "they",
  "we",
  "you",
  "i",
  "me",
  "him",
  "her",
  "us",
  "them",
  "my",
  "your",
  "his",
  "our",
  "their",
  "what",
  "when",
  "where",
  "how",
  "why",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "about",
  "above",
  "after",
  "again",
  "also",
  "any",
  "because",
  "before",
  "between",
  "during",
  "here",
  "if",
  "into",
  "like",
  "new",
  "now",
  "over",
  "then",
  "there",
  "through",
  "under",
  "up",
  "out",
  "off",
  "down",
  "much",
  "well",
  "back",
  "even",
  "still",
  "also",
  "get",
  "got",
  "one",
  "two",
  "make",
  "many",
  "say",
  "said",
  "see",
  "go",
  "come",
  "take",
  "know",
  "think",
  "good",
  "great",
  "first",
  "last",
  "long",
  "way",
  "find",
  "use",
  "used",
  "using",
  "while",
  "being",
  "made",
  "however",
  "since",
  "per",
  "via",
  "based",
  "within",
  "without",
  "across",
  "along",
  "around",
  "among",
  "until",
  "another",
  "www",
  "http",
  "https",
  "com",
]);

// ── Acronym stop list (common non-entity uppercase abbreviations) ───────

const ACRONYM_STOPLIST = new Set([
  "I",
  "A",
  "OK",
  "AM",
  "PM",
  "US",
  "UK",
  "EU",
  "VS",
  "EG",
  "IE",
  "ET",
  "AL",
  "HTML",
  "CSS",
  "JS",
  "TS",
  "URL",
  "HTTP",
  "HTTPS",
  "API",
  "SDK",
  "CLI",
  "GUI",
  "PDF",
  "CSV",
  "JSON",
  "XML",
  "SQL",
  "RSS",
  "FTP",
  "SSH",
  "SSL",
  "TLS",
  "DNS",
  "TCP",
  "UDP",
  "IP",
  "RAM",
  "ROM",
  "CPU",
  "GPU",
  "SSD",
  "HDD",
  "USB",
  "HDMI",
  "FAQ",
  "DIY",
  "ASAP",
  "FYI",
  "TBD",
  "TBA",
  "ETA",
  "ROI",
  "KPI",
  "CEO",
  "CTO",
  "CFO",
  "COO",
  "CIO",
  "VP",
  "SVP",
  "EVP",
  "HR",
  "PR",
  "QA",
  "IT",
  "RD",
  "RND",
  "LLC",
  "INC",
  "LTD",
  "CORP",
  "PLC",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "ID",
  "NO",
  "RE",
  "CC",
  "BCC",
  "GEO",
  "SEO",
  "SEM",
  "PPC",
  "CMS",
  "CRM",
  "ERP",
  "SaaS",
  "AI",
  "ML",
  "NLP",
  "LLM",
  "GPT",
  "NER",
  "TLDR",
  "AKA",
  "RSVP",
  "PS",
]);

// ── Organization suffixes and honorifics ────────────────────────────────

const ORG_SUFFIXES =
  /\b(?:Inc|Corp|Corporation|LLC|Ltd|Limited|Co|Company|Group|Foundation|Institute|University|Association|Society|Agency|Authority|Bureau|Commission|Council|Department|Board|Trust|Fund|Partners|Ventures|Labs|Technologies|Solutions|Systems|Services|Consulting|Media|Network|Studios|Entertainment|Healthcare|Pharmaceuticals|Dynamics|Holdings|Capital|Enterprises|International)\b/i;

const PERSON_HONORIFICS =
  /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof|Professor|Rev|Reverend|Sen|Senator|Rep|Representative|Gov|Governor|Pres|President|Gen|General|Col|Colonel|Sgt|Sergeant|Cpl|Corporal|Pvt|Private|Adm|Admiral|Capt|Captain|Lt|Lieutenant|Maj|Major|Sir|Dame|Lord|Lady|Hon|Honorable|Judge|Justice|Chancellor|Dean|Provost)\.\s*/;

// ── Supplemental pattern-based extractors ────────────────────────────────

/**
 * Extract acronym entities (2-6 uppercase letters) that compromise misses.
 * Filters out common non-entity abbreviations.
 */
function extractAcronymEntities(text: string): string[] {
  const matches = text.match(/\b[A-Z]{2,6}\b/g);
  if (!matches) return [];

  const seen = new Set<string>();
  const results: string[] = [];
  for (const m of matches) {
    if (!ACRONYM_STOPLIST.has(m) && !seen.has(m)) {
      seen.add(m);
      results.push(m);
    }
  }
  return results;
}

/**
 * Extract multi-word title-case proper nouns that compromise may miss.
 * Filters out sentence-initial false positives by checking position.
 */
function extractTitleCaseEntities(text: string): string[] {
  const pattern =
    /\b([A-Z][a-z]+(?:\s+(?:of|the|and|for|de|van|von|al|el|la|le|del|der|den|das|di|du)\s+)?(?:[A-Z][a-z]+)(?:\s+[A-Z][a-z]+){0,3})\b/g;

  const sentences = text.split(/[.!?]\s+/);
  const sentenceStarts = new Set<string>();
  for (const s of sentences) {
    const trimmed = s.trim();
    const firstWord = trimmed.split(/\s+/)[0];
    if (firstWord) sentenceStarts.add(firstWord);
  }

  const seen = new Set<string>();
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const entity = match[1];
    const firstWord = entity.split(/\s+/)[0];
    if (
      sentenceStarts.has(firstWord) &&
      !text.includes(`. ${entity}`) &&
      !text.includes(`, ${entity}`)
    ) {
      const escapedEntity = entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const appearances = text.match(new RegExp(escapedEntity, "g"));
      if (!appearances || appearances.length < 2) continue;
    }

    if (!seen.has(entity) && entity.split(/\s+/).length >= 2) {
      seen.add(entity);
      results.push(entity);
    }
  }
  return results;
}

/**
 * Classify an entity as "organization" if it ends with a corporate suffix.
 */
function isOrganizationByPattern(entity: string): boolean {
  return ORG_SUFFIXES.test(entity);
}

/**
 * Classify an entity as "person" if preceded by an honorific in the text.
 */
function isPersonByHonorific(text: string, entity: string): boolean {
  const escapedEntity = entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?:${PERSON_HONORIFICS.source})\\s*${escapedEntity}`,
    "i",
  );
  return pattern.test(text);
}

// ── TF-IDF topic extraction ──────────────────────────────────────────────

/**
 * Extract topics by term frequency, ranking unigrams and bigrams that appear
 * at least twice. Bigrams are boosted 1.5x since they're more specific.
 */
function extractTopicsByTfIdf(text: string, limit: number): string[] {
  const lower = text.toLowerCase();
  const words = lower
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  if (words.length === 0) return [];

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    freq.set(bigram, (freq.get(bigram) || 0) + 1);
  }

  const candidates: Array<[string, number]> = [];
  for (const [term, count] of freq) {
    if (count >= 2) {
      const isBigram = term.includes(" ");
      const score = isBigram ? count * 1.5 : count;
      candidates.push([term, score]);
    }
  }

  candidates.sort((a, b) => b[1] - a[1]);
  return candidates.slice(0, limit).map(([term]) => term);
}

// ── Deduplication & merging ──────────────────────────────────────────────

/**
 * Deduplicate entity lists with case-insensitive matching and
 * substring containment (keep the longer form).
 */
function smartDedup(entities: string[]): string[] {
  if (entities.length === 0) return [];

  const sorted = [...entities].sort((a, b) => b.length - a.length);
  const result: string[] = [];
  const lowerSeen = new Set<string>();

  for (const entity of sorted) {
    const lower = entity.toLowerCase();

    if (lowerSeen.has(lower)) continue;

    let isSubstring = false;
    for (const accepted of lowerSeen) {
      if (accepted.includes(lower)) {
        isSubstring = true;
        break;
      }
    }
    if (isSubstring) continue;

    result.push(entity);
    lowerSeen.add(lower);
  }

  return result;
}

function mergeEntityLists(
  compromiseList: string[],
  supplementalList: string[],
  limit: number,
): string[] {
  const combined = [...compromiseList, ...supplementalList];
  return smartDedup(combined).slice(0, limit);
}

// ── Main extraction function ────────────────────────────────────────────

export function extractEntities(text: string): ExtractedEntitiesType {
  const doc = compromise(text);

  const compromisePeople = [...new Set(doc.people().out("array") as string[])];
  const compromiseOrgs = [
    ...new Set(doc.organizations().out("array") as string[]),
  ];
  const compromisePlaces = [...new Set(doc.places().out("array") as string[])];

  const acronyms = extractAcronymEntities(text);
  const titleCaseEntities = extractTitleCaseEntities(text);

  const supplementalPeople: string[] = [];
  const supplementalOrgs: string[] = [];
  const unclassified: string[] = [];

  for (const entity of titleCaseEntities) {
    if (isPersonByHonorific(text, entity)) {
      supplementalPeople.push(entity);
    } else if (isOrganizationByPattern(entity)) {
      supplementalOrgs.push(entity);
    } else {
      unclassified.push(entity);
    }
  }

  for (const acr of acronyms) {
    if (isOrganizationByPattern(acr)) {
      supplementalOrgs.push(acr);
    } else {
      unclassified.push(acr);
    }
  }

  const people = mergeEntityLists(compromisePeople, supplementalPeople, 10);
  const organizations = mergeEntityLists(
    compromiseOrgs,
    [...supplementalOrgs, ...unclassified],
    10,
  );
  const places = smartDedup([...new Set(compromisePlaces)]).slice(0, 10);

  const topics = extractTopicsByTfIdf(text, 15);

  const imperativeVerbCount = doc.verbs().isImperative().length;
  const numberCount = doc.numbers().length;

  return {
    people,
    organizations,
    places,
    topics,
    imperativeVerbCount,
    numberCount,
  };
}

// ── NLP utilities ───────────────────────────────────────────────────────

export function computeFleschReadingEase(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  if (words.length === 0 || sentences.length === 0) return 0;

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / words.length;

  return 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
}

export function countComplexWords(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return words.filter((w) => countSyllables(w) >= 4).length;
}

export function countPatternMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

export function countTransitionWords(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  return words.filter((w) => lower.includes(w)).length;
}

export function avgSentenceLength(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  if (sentences.length === 0) return 0;
  return Math.round(words.length / sentences.length);
}
