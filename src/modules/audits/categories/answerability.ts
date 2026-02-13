import type { ExtractedPageType } from "../../extractor/schema.js";
import { CATEGORY_DISPLAY_NAMES } from "../constants.js";
import type { CategoryAuditOutputType, FactorResultType } from "../schema.js";
import { detectAnswerCapsules } from "../support/dom.js";
import { countPatternMatches } from "../support/nlp.js";
import {
  DEFINITION_PATTERNS,
  DIRECT_ANSWER_PATTERNS,
  QUESTION_PATTERNS,
  STEP_PATTERNS,
  SUMMARY_MARKERS,
} from "../support/patterns.js";
import {
  makeFactor,
  maxFactors,
  sumFactors,
  thresholdScore,
} from "../support/scoring.js";

export function auditAnswerability(
  page: ExtractedPageType,
): CategoryAuditOutputType {
  const text = page.cleanText;
  const $ = page.$;
  const factors: FactorResultType[] = [];

  const defCount = countPatternMatches(text, DEFINITION_PATTERNS);
  const defScore = thresholdScore(defCount, [
    [6, 10],
    [3, 7],
    [1, 4],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Definition Patterns",
      defScore,
      10,
      `${defCount} definition patterns`,
    ),
  );

  const directCount = countPatternMatches(text, DIRECT_ANSWER_PATTERNS);
  const directScore = thresholdScore(directCount, [
    [5, 11],
    [2, 8],
    [1, 4],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Direct Answer Statements",
      directScore,
      11,
      `${directCount} direct statements`,
    ),
  );

  const capsules = detectAnswerCapsules(page.$);
  const capsuleRatio =
    capsules.total > 0 ? capsules.withCapsule / capsules.total : 0;
  const capsuleScore =
    capsules.total === 0
      ? 0
      : capsuleRatio >= 0.7
        ? 13
        : capsuleRatio >= 0.4
          ? 9
          : capsuleRatio > 0
            ? 5
            : 2;
  factors.push(
    makeFactor(
      "Answer Capsules",
      capsuleScore,
      13,
      capsules.total > 0
        ? `${capsules.withCapsule}/${capsules.total} question headings have answer capsules`
        : "No question-framed H2s found",
      capsules.total === 0 ? "neutral" : undefined,
    ),
  );

  const stepCount = countPatternMatches(text, STEP_PATTERNS);
  const hasOl = $("ol").length > 0;
  const stepTotal = stepCount + (hasOl ? 2 : 0);
  const stepScore = thresholdScore(stepTotal, [
    [5, 10],
    [2, 7],
    [1, 3],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Step-by-Step Content",
      stepScore,
      10,
      `${stepCount} step indicators${hasOl ? ", ordered lists found" : ""}`,
    ),
  );

  const questionMatches = text.match(/[^.!?]*\?/g) || [];
  const queryMatches = countPatternMatches(text, QUESTION_PATTERNS);
  const qaScore = thresholdScore(questionMatches.length + queryMatches, [
    [10, 11],
    [5, 8],
    [2, 5],
    [1, 2],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Q/A Patterns",
      qaScore,
      11,
      `${questionMatches.length} questions, ${queryMatches} query patterns`,
    ),
  );

  const summaryCount = countPatternMatches(text, SUMMARY_MARKERS);
  const summaryScore = summaryCount >= 2 ? 9 : summaryCount > 0 ? 5 : 0;
  factors.push(
    makeFactor(
      "Summary/Conclusion",
      summaryScore,
      9,
      summaryCount > 0
        ? `${summaryCount} summary markers`
        : "No summary markers",
    ),
  );

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.answerability,
      key: "answerability",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData: {
      answerCapsules: capsules,
      questionsFound: questionMatches.slice(0, 5),
    },
  };
}
