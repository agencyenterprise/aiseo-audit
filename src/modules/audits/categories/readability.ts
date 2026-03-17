import { countWords } from "../../../utils/strings.js";
import type { ExtractedPageType } from "../../extractor/schema.js";
import {
  avgSentenceLength,
  computeFleschReadingEase,
  countComplexWords,
  countTransitionWords,
} from "../../nlp/service.js";
import {
  makeFactor,
  maxFactors,
  sumFactors,
  thresholdScore,
} from "../../scoring/service.js";
import { CATEGORY_DISPLAY_NAMES } from "../constants.js";
import type { CategoryAuditOutputType, FactorResultType } from "../schema.js";
import { TRANSITION_WORDS } from "../support/patterns.js";

export function auditReadabilityForCompression(
  page: ExtractedPageType,
): CategoryAuditOutputType {
  const text = page.cleanText;
  const factors: FactorResultType[] = [];

  const avgSentLen = avgSentenceLength(text);
  const sentScore = thresholdScore(
    avgSentLen,
    [
      [12, 22, 15],
      [8, 29, 10],
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
      [60, 70, 15],
      [71, Infinity, 13],
      [50, 59, 10],
      [30, 49, 6],
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

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.readabilityForCompression,
      key: "readabilityForCompression",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData: {
      avgSentenceLength: avgSentLen,
      readabilityScore: fre,
    },
  };
}
