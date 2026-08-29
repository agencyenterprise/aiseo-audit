import { diceCoefficient } from "dice-coefficient";
import type { ExtractedEntitiesType } from "../schema.js";

export type SalientTermsType = {
  entities: string[];
  terms: string[];
  numbers: string[];
};

const MAX_SALIENT_ITEMS = 10;
const EARLY_TEXT_SHARE = 0.2;
const EARLY_POSITION_BOOST = 1.5;
const NEAR_MATCH_THRESHOLD = 0.6;

const SALIENT_NUMBER_PATTERNS = [
  /\d+(?:\.\d+)?\s*%/g,
  /\d+(?:\.\d+)?\s*(?:million|billion|thousand|trillion)/gi,
  /[$€£¥]\s?\d[\d,.]*/g,
  /\d[\d,.]*\s?(?:USD|EUR|GBP)/g,
  /\b\d{4}\b/g,
];

export function extractSalientTerms(
  text: string,
  entities: ExtractedEntitiesType,
): SalientTermsType {
  const earlyText = text.slice(0, Math.ceil(text.length * EARLY_TEXT_SHARE));

  const namedEntities = [
    ...entities.people,
    ...entities.organizations,
    ...entities.places,
  ];

  return {
    entities: rankByFrequencyWithEarlyBoost(namedEntities, text, earlyText),
    terms: rankByFrequencyWithEarlyBoost(entities.topics, text, earlyText),
    numbers: salientNumbers(text).slice(0, MAX_SALIENT_ITEMS),
  };
}

export function textCoversItem(fieldText: string, item: string): boolean {
  const field = fieldText.toLowerCase();
  const candidate = item.toLowerCase();
  if (containsWholeWords(field, candidate)) return true;
  return fieldNGramsNearlyMatch(field, candidate);
}

export function coverageOfItems(fieldText: string, items: string[]): number {
  if (items.length === 0) return 0;
  const covered = items.filter((item) => textCoversItem(fieldText, item));
  return covered.length / items.length;
}

function rankByFrequencyWithEarlyBoost(
  candidates: string[],
  text: string,
  earlyText: string,
): string[] {
  const lowerText = text.toLowerCase();
  const lowerEarlyText = earlyText.toLowerCase();

  return [...new Set(candidates)]
    .map((candidate) => {
      const occurrences = countOccurrences(lowerText, candidate.toLowerCase());
      const appearsEarly = lowerEarlyText.includes(candidate.toLowerCase());
      return {
        candidate,
        weight: occurrences * (appearsEarly ? EARLY_POSITION_BOOST : 1),
      };
    })
    .filter(({ weight }) => weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_SALIENT_ITEMS)
    .map(({ candidate }) => candidate);
}

function salientNumbers(text: string): string[] {
  const found = SALIENT_NUMBER_PATTERNS.flatMap(
    (pattern) => text.match(pattern) ?? [],
  );
  return [...new Set(found.map((match) => match.trim()))];
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function containsWholeWords(field: string, candidate: string): boolean {
  const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(field);
}

function fieldNGramsNearlyMatch(field: string, candidate: string): boolean {
  const candidateWordCount = candidate.split(/\s+/).length;
  const fieldWords = field.split(/\s+/).filter((word) => word.length > 0);
  if (fieldWords.length < candidateWordCount) {
    return diceCoefficient(field, candidate) >= NEAR_MATCH_THRESHOLD;
  }

  for (let i = 0; i + candidateWordCount <= fieldWords.length; i += 1) {
    const window = fieldWords.slice(i, i + candidateWordCount).join(" ");
    if (diceCoefficient(window, candidate) >= NEAR_MATCH_THRESHOLD) return true;
  }
  return false;
}
