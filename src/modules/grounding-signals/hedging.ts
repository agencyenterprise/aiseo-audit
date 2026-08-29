import { hedges } from "hedges";

export type HedgingResultType = {
  sentenceCount: number;
  hedgedSentenceCount: number;
  hedgedShare: number;
};

const HEDGE_LEXICON = new Set(hedges.map((hedge) => hedge.toLowerCase()));
const MAX_HEDGE_PHRASE_WORDS = Math.max(
  ...hedges.map((hedge) => hedge.split(" ").length),
);

export function measureHedging(text: string): HedgingResultType {
  const sentences = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 5);

  const hedgedSentenceCount = sentences.filter(sentenceContainsHedge).length;

  return {
    sentenceCount: sentences.length,
    hedgedSentenceCount,
    hedgedShare:
      sentences.length > 0 ? hedgedSentenceCount / sentences.length : 0,
  };
}

function sentenceContainsHedge(sentence: string): boolean {
  const words = sentence
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);

  for (let start = 0; start < words.length; start += 1) {
    for (
      let length = 1;
      length <= MAX_HEDGE_PHRASE_WORDS && start + length <= words.length;
      length += 1
    ) {
      if (HEDGE_LEXICON.has(words.slice(start, start + length).join(" "))) {
        return true;
      }
    }
  }
  return false;
}
