import { escapeRegExp } from "../../../utils/strings.js";
import {
  ACRONYM_STOPLIST,
  ORG_NAME_ENDS_WITH_COMPANY_SUFFIX,
  HONORIFIC_BEFORE_NAME,
} from "../constants.js";

const ROMAN_NUMERAL = /^[IVXLCDM]+$/;

const TITLE_CASE_COMPOUND =
  /\b([A-Z][a-z]+(?:\s+(?:of|the|and|for|de|van|von|al|el|la|le|del|der|den|das|di|du))?\s+(?:[A-Z][a-z]+)(?:\s+[A-Z][a-z]+){0,3})\b/g;

export function extractAcronymEntities(text: string): string[] {
  const matches = text.match(/\b[A-Z]{2,6}\b/g);
  if (!matches) return [];

  const seen = new Set<string>();
  const results: string[] = [];
  for (const acronym of matches) {
    if (
      !ACRONYM_STOPLIST.has(acronym) &&
      !ROMAN_NUMERAL.test(acronym) &&
      !seen.has(acronym)
    ) {
      seen.add(acronym);
      results.push(acronym);
    }
  }
  return results;
}

export function extractTitleCaseEntities(text: string): string[] {
  const sentenceStartWords = collectSentenceStartWords(text);
  const seen = new Set<string>();
  const results: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = TITLE_CASE_COMPOUND.exec(text)) !== null) {
    const candidate = match[1];
    if (isLikelyCapitalizedProse(candidate, text, sentenceStartWords)) {
      continue;
    }
    if (!seen.has(candidate) && isMultiWord(candidate)) {
      seen.add(candidate);
      results.push(candidate);
    }
  }
  return results;
}

function collectSentenceStartWords(text: string): Set<string> {
  const sentenceStartWords = new Set<string>();
  for (const sentence of text.split(/[.!?]\s+/)) {
    const firstWord = sentence.trim().split(/\s+/)[0];
    if (firstWord) sentenceStartWords.add(firstWord);
  }
  return sentenceStartWords;
}

function isLikelyCapitalizedProse(
  candidate: string,
  text: string,
  sentenceStartWords: Set<string>,
): boolean {
  const firstWord = candidate.split(/\s+/)[0];
  const onlySeenAtSentenceStarts =
    sentenceStartWords.has(firstWord) && !appearsMidSentence(text, candidate);
  return onlySeenAtSentenceStarts && !appearsAtLeastTwice(text, candidate);
}

function appearsMidSentence(text: string, candidate: string): boolean {
  return text.includes(`. ${candidate}`) || text.includes(`, ${candidate}`);
}

function appearsAtLeastTwice(text: string, candidate: string): boolean {
  const appearances = text.match(new RegExp(escapeRegExp(candidate), "g"));
  return appearances !== null && appearances.length >= 2;
}

function isMultiWord(candidate: string): boolean {
  return candidate.split(/\s+/).length >= 2;
}

export function isOrganizationByPattern(entity: string): boolean {
  return ORG_NAME_ENDS_WITH_COMPANY_SUFFIX.test(entity);
}

export function isPersonByHonorific(text: string, entity: string): boolean {
  const pattern = new RegExp(
    `(?:${HONORIFIC_BEFORE_NAME.source})\\s*${escapeRegExp(entity)}`,
    "i",
  );
  return pattern.test(text);
}

export function smartDedup(entities: string[]): string[] {
  if (entities.length === 0) return [];

  const longestFirst = [...entities].sort((a, b) => b.length - a.length);
  const result: string[] = [];
  const acceptedLower = new Set<string>();

  for (const entity of longestFirst) {
    const lower = entity.toLowerCase();
    if (acceptedLower.has(lower)) continue;
    if (isWholeWordSubphraseOfAny(lower, acceptedLower)) continue;

    result.push(entity);
    acceptedLower.add(lower);
  }

  return result;
}

function isWholeWordSubphraseOfAny(
  candidateLower: string,
  acceptedLower: Set<string>,
): boolean {
  const asWholeWords = new RegExp(`\\b${escapeRegExp(candidateLower)}\\b`);
  for (const accepted of acceptedLower) {
    if (asWholeWords.test(accepted)) return true;
  }
  return false;
}

export function mergeEntityLists(
  compromiseList: string[],
  supplementalList: string[],
): string[] {
  return smartDedup([...compromiseList, ...supplementalList]);
}
