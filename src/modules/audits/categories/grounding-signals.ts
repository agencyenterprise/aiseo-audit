import type { ExtractedPageType } from "../../extractor/schema.js";
import { CATEGORY_DISPLAY_NAMES } from "../constants.js";
import type { CategoryAuditOutput, FactorResultType } from "../schema.js";
import { countPatternMatches } from "../support/nlp.js";
import {
  ATTRIBUTION_PATTERNS,
  CITATION_PATTERNS,
  NUMERIC_CLAIM_PATTERNS,
  QUOTED_ATTRIBUTION_PATTERNS,
} from "../support/patterns.js";
import {
  makeFactor,
  maxFactors,
  sumFactors,
  thresholdScore,
} from "../support/scoring.js";

export function auditGroundingSignals(
  page: ExtractedPageType,
): CategoryAuditOutput {
  const $ = page.$;
  const text = page.cleanText;
  const factors: FactorResultType[] = [];

  const externalLinks = page.externalLinks;

  const extScore = thresholdScore(externalLinks.length, [
    [6, 13],
    [3, 10],
    [1, 6],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "External References",
      extScore,
      13,
      `${externalLinks.length} external links`,
    ),
  );

  const citationCount = countPatternMatches(text, CITATION_PATTERNS);
  const blockquotes = $("blockquote, cite, q").length;
  const totalCitations = citationCount + blockquotes;
  const citScore = thresholdScore(totalCitations, [
    [6, 13],
    [3, 9],
    [1, 5],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Citation Patterns",
      citScore,
      13,
      `${citationCount} citation indicators, ${blockquotes} quote elements`,
    ),
  );

  const numericCount = countPatternMatches(text, NUMERIC_CLAIM_PATTERNS);
  const numScore = thresholdScore(numericCount, [
    [9, 13],
    [4, 9],
    [1, 5],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Numeric Claims",
      numScore,
      13,
      `${numericCount} statistical references`,
    ),
  );

  const attrCount = countPatternMatches(text, ATTRIBUTION_PATTERNS);
  const attrScore = thresholdScore(attrCount, [
    [5, 11],
    [2, 8],
    [1, 4],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Attribution Indicators",
      attrScore,
      11,
      `${attrCount} attribution patterns`,
    ),
  );

  const quotedAttrPatterns = countPatternMatches(
    text,
    QUOTED_ATTRIBUTION_PATTERNS,
  );
  const blockquotesWithCite = $("blockquote").filter(
    (_, el) => $(el).find("cite, footer, figcaption").length > 0,
  ).length;
  const totalQuotedAttr = quotedAttrPatterns + blockquotesWithCite;
  const quotedAttrScore = thresholdScore(totalQuotedAttr, [
    [4, 10],
    [2, 7],
    [1, 4],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Quoted Attribution",
      quotedAttrScore,
      10,
      `${totalQuotedAttr} attributed quotes`,
      totalQuotedAttr === 0 ? "neutral" : undefined,
    ),
  );

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.groundingSignals,
      key: "groundingSignals",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData: {
      externalLinks: externalLinks.slice(0, 10),
    },
  };
}
