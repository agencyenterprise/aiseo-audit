import type { ExtractedPageType } from "../extractor/schema.js";
import { buildCategoryOutput } from "../audits/category.js";
import { countPatternMatches, extractEntities } from "../nlp/service.js";
import { makeFactor, thresholdScore } from "../scoring/service.js";
import type {
  CategoryAuditOutputType,
  ExtractedEntitiesType,
  FactorResultType,
} from "../audits/schema.js";
import { measureHedging } from "./hedging.js";
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

  factors.push(hedgedLanguageFactor(text));

  return buildCategoryOutput("groundingSignals", factors, {
    externalLinks: externalLinks.slice(0, 10),
  });
}

function countCitesOutsideBlockquotes($: ExtractedPageType["$"]): number {
  return $("cite").filter((_, el) => $(el).parents("blockquote").length === 0)
    .length;
}

const CONFIDENT_HEDGE_SHARE = 0.05;
const ACCEPTABLE_HEDGE_SHARE = 0.12;
const HEAVY_HEDGE_SHARE = 0.2;

function hedgedLanguageFactor(text: string): FactorResultType {
  const hedging = measureHedging(text);
  const sharePct = `${(hedging.hedgedShare * 100).toFixed(1)}%`;
  const value = `${hedging.hedgedSentenceCount} of ${hedging.sentenceCount} sentences hedge (${sharePct})`;

  if (hedging.sentenceCount === 0) {
    return makeFactor(
      "Hedged Language",
      0,
      10,
      "No sentences found",
      "neutral",
    );
  }
  if (hedging.hedgedShare <= CONFIDENT_HEDGE_SHARE) {
    return makeFactor("Hedged Language", 10, 10, value);
  }
  if (hedging.hedgedShare <= ACCEPTABLE_HEDGE_SHARE) {
    return makeFactor("Hedged Language", 6, 10, value);
  }
  if (hedging.hedgedShare <= HEAVY_HEDGE_SHARE) {
    return makeFactor("Hedged Language", 3, 10, value);
  }
  return makeFactor("Hedged Language", 0, 10, value);
}
