import { countSyllables } from "../../../utils/strings.js";

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

export function avgSentenceLength(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  if (sentences.length === 0) return 0;
  return Math.round(words.length / sentences.length);
}
