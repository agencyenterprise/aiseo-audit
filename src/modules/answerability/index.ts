import type {
  CategoryAuditOutputType,
  ExtractedEntitiesType,
  FactorResultType,
} from "../audits/schema.js";
import { buildCategoryOutput } from "../audits/category.js";
import type { ExtractedPageType } from "../extractor/schema.js";
import { countPatternMatches, extractEntities } from "../nlp/service.js";
import { extractSalientTerms } from "../nlp/support/salience.js";
import {
  makeDiagnostic,
  makeFactor,
  thresholdScore,
} from "../scoring/service.js";
import { detectAnswerCapsules } from "./capsules.js";
import { detectLeadSummary, scoreLeadSummary } from "./lead-summary.js";
import {
  DEFINITION_PATTERNS,
  DIRECT_ANSWER_PATTERNS,
  EXPLANATORY_DEPTH_PATTERNS,
  QUESTION_PATTERNS,
  STEP_PATTERNS,
  SUMMARY_MARKERS,
} from "./patterns.js";
import { extractQuestions } from "./questions.js";

export type AnswerabilityOptionsType = {
  domain?: "product" | "informational";
};

export function auditAnswerability(
  page: ExtractedPageType,
  preExtracted?: ExtractedEntitiesType,
  options: AnswerabilityOptionsType = {},
): CategoryAuditOutputType {
  const text = page.cleanText;
  const $ = page.$;
  const factors: FactorResultType[] = [];
  const entities = preExtracted ?? extractEntities(text);
  const { imperativeVerbCount = 0 } = entities;

  const salient = extractSalientTerms(text, entities);
  const leadSummary = detectLeadSummary($, text, salient.entities);
  factors.push(
    makeFactor(
      "Lead Summary",
      scoreLeadSummary(leadSummary),
      13,
      describeLeadSummary(leadSummary),
    ),
  );

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
  factors.push(
    makeDiagnostic(
      "Answer Capsules",
      capsules.total > 0
        ? `${capsules.withCapsule}/${capsules.total} question headings have answer capsules`
        : "No question-framed H2s found",
    ),
  );

  const stepCount = countPatternMatches(text, STEP_PATTERNS);
  const hasOl = $("ol").length > 0;
  const stepTotal = stepCount + imperativeVerbCount + (hasOl ? 2 : 0);
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
      `${stepCount} step indicators, ${imperativeVerbCount} instruction verbs${hasOl ? ", ordered lists found" : ""}`,
    ),
  );

  const questionMatches = extractQuestions(text);
  const queryMatches = countPatternMatches(text, QUESTION_PATTERNS);
  factors.push(
    makeDiagnostic(
      "Q/A Patterns",
      `${questionMatches.length} questions, ${queryMatches} query patterns`,
    ),
  );

  const summaryCount = countPatternMatches(text, SUMMARY_MARKERS);
  const summaryScore = thresholdScore(summaryCount, [
    [2, 9],
    [1, 5],
  ]);
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

  factors.push(explanatoryDepthFactor($, text, options.domain));

  return buildCategoryOutput("answerability", factors, {
    answerCapsules: capsules,
    questionsFound: questionMatches.slice(0, 5),
  });
}

function describeLeadSummary(leadSummary: {
  hasIntroParagraphUnderH1: boolean;
  hasExplicitSummaryMarker: boolean;
  firstParagraphStatesMainClaim: boolean;
}): string {
  const present = [
    leadSummary.hasIntroParagraphUnderH1 && "intro paragraph under H1",
    leadSummary.hasExplicitSummaryMarker && "explicit summary marker",
    leadSummary.firstParagraphStatesMainClaim && "main claim stated first",
  ].filter(Boolean);
  return present.length > 0
    ? present.join(", ")
    : "No lead summary: the page does not state its conclusion first";
}

const HOW_OR_WHY_HEADING = /^(?:how|why)\b/i;

function explanatoryDepthFactor(
  $: ExtractedPageType["$"],
  text: string,
  domain: "product" | "informational" | undefined,
): FactorResultType {
  const markerCount = countPatternMatches(text, EXPLANATORY_DEPTH_PATTERNS);
  const howOrWhyHeadings = $("h2, h3")
    .toArray()
    .filter((el) => HOW_OR_WHY_HEADING.test($(el).text().trim())).length;
  const depthSignals = markerCount + howOrWhyHeadings;
  const depthScore = thresholdScore(depthSignals, [
    [6, 10],
    [3, 7],
    [1, 3],
    [0, 0],
  ]);

  return makeFactor(
    "Explanatory Depth",
    depthScore,
    10,
    `${markerCount} explanatory markers, ${howOrWhyHeadings} how/why headings`,
    domain === "product" ? "neutral" : undefined,
  );
}
