import type { ExtractedPageType } from "../extractor/schema.js";
import { buildCategoryOutput } from "../audits/category.js";
import { countPatternMatches, extractEntities } from "../nlp/service.js";
import { makeFactor, thresholdScore } from "../scoring/service.js";
import type {
  CategoryAuditOutputType,
  ExtractedEntitiesType,
  FactorResultType,
} from "../audits/schema.js";
import {
  ATTRIBUTION_PATTERNS,
  CITATION_PATTERNS,
  NUMERIC_CLAIM_PATTERNS,
  QUOTED_ATTRIBUTION_PATTERNS,
} from "./patterns.js";

export function auditGroundingSignals(
  page: ExtractedPageType,
  preExtracted?: ExtractedEntitiesType,
): CategoryAuditOutputType {
  const $ = page.$;
  const text = page.cleanText;
  const factors: FactorResultType[] = [];
  const { numberCount: writtenOutNumberCount = 0 } =
    preExtracted ?? extractEntities(text);

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
  const quoteElements =
    $("blockquote, q").length + countCitesOutsideBlockquotes($);
  const totalCitations = citationCount + quoteElements;
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
      `${citationCount} citation indicators, ${quoteElements} quote elements`,
    ),
  );

  const numericCount = countPatternMatches(text, NUMERIC_CLAIM_PATTERNS);
  const totalNumericSignals = numericCount + writtenOutNumberCount;
  const numScore = thresholdScore(totalNumericSignals, [
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
      `${numericCount} statistical references, ${writtenOutNumberCount} written-out numbers`,
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

  return buildCategoryOutput("groundingSignals", factors, {
    externalLinks: externalLinks.slice(0, 10),
  });
}

function countCitesOutsideBlockquotes($: ExtractedPageType["$"]): number {
  return $("cite").filter((_, el) => $(el).parents("blockquote").length === 0)
    .length;
}
