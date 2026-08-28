import { countWords } from "../../utils/strings.js";
import { buildCategoryOutput } from "../audits/category.js";
import type { ExtractedPageType } from "../extractor/schema.js";
import {
  avgSentenceLength,
  computeFleschReadingEase,
  countComplexWords,
} from "../nlp/service.js";
import { makeFactor, thresholdScore } from "../scoring/service.js";
import type {
  CategoryAuditOutputType,
  FactorResultType,
} from "../audits/schema.js";
import { countTransitionWords, TRANSITION_WORDS } from "./transition-words.js";

export function auditReadabilityForCompression(
  page: ExtractedPageType,
): CategoryAuditOutputType {
  const text = page.cleanText;
  const factors: FactorResultType[] = [];

  const avgSentLen = avgSentenceLength(text);
  const sentScore = thresholdScore(
    avgSentLen,
    [
      [12, 23, 15],
      [8, 30, 10],
      [1, Infinity, 5],
    ],
    "range",
  );
  factors.push(
    makeFactor(
      "Sentence Length",
      sentScore,
      15,
      `Avg ${avgSentLen} words/sentence`,
    ),
  );

  const fre = computeFleschReadingEase(text);
  const freScore = thresholdScore(
    fre,
    [
      [60, 71, 15],
      [71, Infinity, 13],
      [50, 60, 10],
      [30, 50, 6],
    ],
    "range",
  );
  factors.push(
    makeFactor(
      "Readability",
      freScore,
      15,
      `Flesch Reading Ease: ${fre.toFixed(1)}`,
    ),
  );

  const totalWords = countWords(text);
  const complex = countComplexWords(text);
  const jargonRatio = totalWords > 0 ? complex / totalWords : 0;
  const jargonScore = thresholdScore(
    jargonRatio,
    [
      [0.02, 15],
      [0.05, 12],
      [0.1, 8],
    ],
    "lower",
  );
  factors.push(
    makeFactor(
      "Jargon Density",
      jargonScore,
      15,
      `${(jargonRatio * 100).toFixed(1)}% complex words`,
    ),
  );

  const transCount = countTransitionWords(text, TRANSITION_WORDS);
  const transScore = thresholdScore(transCount, [
    [10, 15],
    [5, 11],
    [2, 7],
    [1, 3],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Transition Usage",
      transScore,
      15,
      `${transCount} transition types found`,
    ),
  );

  return buildCategoryOutput("readabilityForCompression", factors, {
    avgSentenceLength: avgSentLen,
    readabilityScore: fre,
  });
}
