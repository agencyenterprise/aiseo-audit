import { countWords } from "../../utils/strings.js";
import { buildCategoryOutput } from "../audits/category.js";
import type { ExtractedPageType } from "../extractor/schema.js";
import {
  avgSentenceLength,
  computeFleschReadingEase,
  countComplexWords,
} from "../nlp/service.js";
import { makeDiagnostic, makeFactor } from "../scoring/service.js";
import type {
  CategoryAuditOutputType,
  FactorResultType,
} from "../audits/schema.js";
import { countTransitionWords, TRANSITION_WORDS } from "./transition-words.js";

const SENTENCE_LENGTH_FLOOR = 35;
const FLESCH_FLOOR = 30;
const JARGON_RATIO_CEILING = 0.1;

export function auditReadabilityForCompression(
  page: ExtractedPageType,
): CategoryAuditOutputType {
  const text = page.cleanText;
  const factors: FactorResultType[] = [];

  const avgSentLen = avgSentenceLength(text);
  factors.push(
    makeFactor(
      "Sentence Length",
      avgSentLen > SENTENCE_LENGTH_FLOOR ? 0 : 10,
      10,
      avgSentLen > SENTENCE_LENGTH_FLOOR
        ? `Avg ${avgSentLen} words/sentence, above the ${SENTENCE_LENGTH_FLOOR}-word floor`
        : `Avg ${avgSentLen} words/sentence`,
    ),
  );

  const fre = computeFleschReadingEase(text);
  factors.push(
    makeFactor(
      "Readability",
      fre < FLESCH_FLOOR ? 0 : 10,
      10,
      fre < FLESCH_FLOOR
        ? `Flesch Reading Ease ${fre.toFixed(1)}, below the ${FLESCH_FLOOR}-point floor`
        : `Flesch Reading Ease: ${fre.toFixed(1)}`,
    ),
  );

  const totalWords = countWords(text);
  const complex = countComplexWords(text);
  const jargonRatio = totalWords > 0 ? complex / totalWords : 0;
  factors.push(
    makeFactor(
      "Jargon Density",
      jargonRatio > JARGON_RATIO_CEILING ? 0 : 10,
      10,
      jargonRatio > JARGON_RATIO_CEILING
        ? `${(jargonRatio * 100).toFixed(1)}% complex words, above the ${JARGON_RATIO_CEILING * 100}% ceiling`
        : `${(jargonRatio * 100).toFixed(1)}% complex words`,
    ),
  );

  const transCount = countTransitionWords(text, TRANSITION_WORDS);
  factors.push(
    makeDiagnostic("Transition Usage", `${transCount} transition types found`),
  );

  return buildCategoryOutput("readabilityForCompression", factors, {
    avgSentenceLength: avgSentLen,
    readabilityScore: fre,
  });
}
