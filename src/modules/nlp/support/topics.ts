import type compromise from "compromise";
import { STOPWORDS } from "../constants.js";

export function extractTopicsByTfIdf(
  doc: ReturnType<typeof compromise>,
): string[] {
  const nounSet = new Set(
    (doc.nouns().out("array") as string[]).flatMap((w) =>
      w
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
    ),
  );

  const words = doc
    .text()
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && nounSet.has(w));

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
    if (count >= 3) {
      const isBigram = term.includes(" ");
      const score = isBigram ? count * 1.5 : count;
      candidates.push([term, score]);
    }
  }

  candidates.sort((a, b) => b[1] - a[1]);
  return candidates.map(([term]) => term);
}
