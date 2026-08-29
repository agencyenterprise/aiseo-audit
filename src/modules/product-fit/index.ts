import { buildCategoryOutput } from "../audits/category.js";
import type {
  CategoryAuditOutputType,
  FactorResultType,
} from "../audits/schema.js";
import type { ExtractedPageType } from "../extractor/schema.js";
import { parseJsonLdObjects } from "../extractor/json-ld.js";
import { makeFactor, thresholdScore } from "../scoring/service.js";

export function auditProductFit(
  page: ExtractedPageType,
): CategoryAuditOutputType {
  const factors: FactorResultType[] = [];
  const price = detectPrice(page);

  factors.push(
    makeFactor(
      "Price Presence",
      price.found ? 15 : 0,
      15,
      price.found
        ? `Price found via ${price.source}`
        : "No price information; missing price acted as a near-deterministic citation gatekeeper for product content",
    ),
  );

  const specs = countSpecificationSignals(page);
  const specScore = thresholdScore(specs, [
    [6, 10],
    [3, 7],
    [1, 3],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Technical Specifications",
      specScore,
      10,
      `${specs} specification signals (spec rows, labeled attributes, model numbers)`,
    ),
  );

  const comparisons = countComparisonSignals(page);
  const comparisonScore = thresholdScore(comparisons, [
    [5, 8],
    [2, 5],
    [1, 2],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Comparison Content",
      comparisonScore,
      8,
      `${comparisons} comparison signals`,
    ),
  );

  return buildCategoryOutput("productFit", factors, {
    priceSignals: price,
  });
}

export type PriceSignalsType = {
  found: boolean;
  source: "json-ld" | "visible-text" | "none";
};

const VISIBLE_PRICE = /[$€£¥]\s?\d[\d,.]*|\d[\d,.]*\s?(?:USD|EUR|GBP)/;

function detectPrice(page: ExtractedPageType): PriceSignalsType {
  if (jsonLdCarriesPrice(page)) return { found: true, source: "json-ld" };
  if (VISIBLE_PRICE.test(page.cleanText)) {
    return { found: true, source: "visible-text" };
  }
  return { found: false, source: "none" };
}

function jsonLdCarriesPrice(page: ExtractedPageType): boolean {
  return parseJsonLdObjects(page.$).some(schemaCarriesPrice);
}

function schemaCarriesPrice(schema: Record<string, unknown>): boolean {
  if (schema.price != null) return true;
  const offers = schema.offers;
  const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];
  return offerList.some(
    (offer) =>
      typeof offer === "object" &&
      offer !== null &&
      ((offer as Record<string, unknown>).price != null ||
        (offer as Record<string, unknown>).lowPrice != null),
  );
}

const SPEC_LABEL_LINE =
  /^(?:weight|dimensions?|material|capacity|battery|model|size|color|power|voltage|storage|display|resolution)\s*:/i;
const MODEL_NUMBER = /\b[A-Z]{1,4}-?\d{2,}[A-Z]?\b/g;

function countSpecificationSignals(page: ExtractedPageType): number {
  const $ = page.$;

  const specTableRows = $("table tr")
    .toArray()
    .filter((row) => /\d/.test($(row).text())).length;
  const definitionPairs = $("dl dt").length;
  const labeledBullets = $("li")
    .toArray()
    .filter((item) => SPEC_LABEL_LINE.test($(item).text().trim())).length;
  const modelNumbers = page.cleanText.match(MODEL_NUMBER)?.length ?? 0;

  return (
    specTableRows + definitionPairs + labeledBullets + Math.min(modelNumbers, 5)
  );
}

const COMPARISON_LANGUAGE = [
  /\bvs\.?\b/gi,
  /\bcompared\s+(?:to|with)\b/gi,
  /\balternatives?\s+to\b/gi,
  /\bbetter\s+than\b/gi,
  /\bpros\s+and\s+cons\b/gi,
];

function countComparisonSignals(page: ExtractedPageType): number {
  const languageHits = COMPARISON_LANGUAGE.reduce(
    (total, pattern) => total + (page.cleanText.match(pattern)?.length ?? 0),
    0,
  );
  const comparisonTables = page
    .$("table")
    .toArray()
    .filter((table) => /\bvs\.?\b|compar/i.test(page.$(table).text())).length;

  return languageHits + comparisonTables * 2;
}
