import {
  countSentences,
  countSyllables,
  countWords,
} from "../../../utils/strings.js";

export function computeFleschReadingEase(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const sentenceCount = countSentences(text);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  if (wordCount === 0 || sentenceCount === 0) return 0;

  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = totalSyllables / wordCount;

  return 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
}

export function countComplexWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0 && countSyllables(w) >= 4)
    .length;
}

export function avgSentenceLength(text: string): number {
  const sentenceCount = countSentences(text);
  if (sentenceCount === 0) return 0;
  return Math.round(countWords(text) / sentenceCount);
}
