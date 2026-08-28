import { escapeRegExp } from "../../utils/strings.js";

export const TRANSITION_WORDS = [
  "however",
  "therefore",
  "moreover",
  "furthermore",
  "consequently",
  "additionally",
  "in contrast",
  "similarly",
  "as a result",
  "for example",
  "for instance",
  "on the other hand",
  "nevertheless",
  "meanwhile",
  "likewise",
  "in addition",
  "specifically",
  "in particular",
  "notably",
  "importantly",
];

export function countTransitionWords(text: string, words: string[]): number {
  const lowerText = text.toLowerCase();
  return words.filter((word) => appearsAsWholeWords(lowerText, word)).length;
}

function appearsAsWholeWords(text: string, phrase: string): boolean {
  return new RegExp(`\\b${escapeRegExp(phrase)}\\b`).test(text);
}
