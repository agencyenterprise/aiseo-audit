import { countWords } from "../../../utils/strings.js";
import type { ExtractedPageType } from "../../extractor/schema.js";
import { CATEGORY_DISPLAY_NAMES } from "../constants.js";
import type { CategoryAuditOutputType, FactorResultType } from "../schema.js";
import {
  avgSentenceLength,
  computeFleschReadingEase,
  countComplexWords,
  countTransitionWords,
} from "../support/nlp.js";
import { TRANSITION_WORDS } from "../support/patterns.js";
import {
  makeFactor,
  maxFactors,
  sumFactors,
  thresholdScore,
} from "../support/scoring.js";

export function auditReadabilityForCompression(
  page: ExtractedPageType,
): CategoryAuditOutputType {
  const text = page.cleanText;
  const factors: FactorResultType[] = [];

  const avgSentLen = avgSentenceLength(text);
  const sentScore =
    avgSentLen >= 12 && avgSentLen <= 22
      ? 15
      : avgSentLen >= 8 && avgSentLen < 30
        ? 10
        : avgSentLen > 0
          ? 5
          : 0;
  factors.push(
    makeFactor(
      "Sentence Length",
      sentScore,
      15,
      `Avg ${avgSentLen} words/sentence`,
    ),
  );

  const fre = computeFleschReadingEase(text);
  const freScore =
    fre >= 60 && fre <= 70
      ? 15
      : fre > 70
        ? 13
        : fre >= 50
          ? 10
          : fre >= 30
            ? 6
            : 3;
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
  const jargonScore =
    jargonRatio <= 0.02
      ? 15
      : jargonRatio <= 0.05
        ? 12
        : jargonRatio <= 0.1
          ? 8
          : 3;
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
