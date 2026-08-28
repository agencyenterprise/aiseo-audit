import type compromise from "compromise";
import { STOPWORDS } from "../constants.js";

const MAX_TOPICS = 15;
const MIN_TERM_COUNT = 3;
const BIGRAM_BOOST = 1.5;

export function extractTopics(doc: ReturnType<typeof compromise>): string[] {
  const nounSet = new Set(
    (doc.nouns().out("array") as string[]).flatMap((w) =>
      w
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
    ),
  );

  const rawTokens = doc
    .text()
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const isTopicToken = (w: string) =>
    w.length > 2 && !STOPWORDS.has(w) && nounSet.has(w);

  const freq = new Map<string, number>();
  for (const w of rawTokens) {
    if (isTopicToken(w)) freq.set(w, (freq.get(w) || 0) + 1);
  }

  for (let i = 0; i < rawTokens.length - 1; i++) {
    const a = rawTokens[i];
    const b = rawTokens[i + 1];
    if (isTopicToken(a) && isTopicToken(b)) {
      const bigram = `${a} ${b}`;
      freq.set(bigram, (freq.get(bigram) || 0) + 1);
    }
  }

  const candidates: Array<[string, number]> = [];
  for (const [term, count] of freq) {
    if (count >= MIN_TERM_COUNT) {
      const isBigram = term.includes(" ");
      const score = isBigram ? count * BIGRAM_BOOST : count;
      candidates.push([term, score]);
    }
  }

  candidates.sort((a, b) => b[1] - a[1]);
  return candidates.slice(0, MAX_TOPICS).map(([term]) => term);
}
