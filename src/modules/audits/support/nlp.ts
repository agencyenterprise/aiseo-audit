import compromise from "compromise";
import { countSyllables } from "../../../utils/strings.js";
import type { ExtractedEntitiesType } from "../schema.js";

export function extractEntities(text: string): ExtractedEntitiesType {
  const doc = compromise(text);

  const people = [...new Set(doc.people().out("array") as string[])].slice(
    0,
    10,
  );
  const organizations = [
    ...new Set(doc.organizations().out("array") as string[]),
  ].slice(0, 10);
  const places = [...new Set(doc.places().out("array") as string[])].slice(
    0,
    10,
  );
  const topics = [...new Set(doc.topics().out("array") as string[])].slice(
    0,
    15,
  );

  return { people, organizations, places, topics };
}

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
