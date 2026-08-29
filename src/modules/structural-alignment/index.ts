import { buildCategoryOutput } from "../audits/category.js";
import type {
  CategoryAuditOutputType,
  ExtractedEntitiesType,
  FactorResultType,
} from "../audits/schema.js";
import type { ExtractedPageType } from "../extractor/schema.js";
import { parseJsonLdObjects } from "../extractor/json-ld.js";
import { extractEntities } from "../nlp/service.js";
import {
  coverageOfItems,
  extractSalientTerms,
  type SalientTermsType,
} from "../nlp/support/salience.js";
import { makeFactor, thresholdScore } from "../scoring/service.js";

export function auditStructuralAlignment(
  page: ExtractedPageType,
  preExtracted?: ExtractedEntitiesType,
): CategoryAuditOutputType {
  const entities = preExtracted ?? extractEntities(page.cleanText);
  const salient = extractSalientTerms(page.cleanText, entities);
  const salientItems = [...salient.entities, ...salient.terms];
  const factors: FactorResultType[] = [];

  factors.push(
    alignmentFactor(
      "Title Entity Alignment",
      12,
      page.title,
      salientItems,
      salient,
      "title",
    ),
  );

  factors.push(
    alignmentFactor(
      "Meta Description Alignment",
      8,
      page.metaDescription,
      salientItems,
      salient,
      "meta description",
    ),
  );

  const headingText = page
    .$("h1, h2, h3")
    .toArray()
    .map((el) => page.$(el).text())
    .join(" ");
  factors.push(
    alignmentFactor(
      "Heading Entity Alignment",
      10,
      headingText,
      salientItems,
      salient,
      "headings",
    ),
  );

  const jsonLdText = structuredDataText(page);
  factors.push(
    jsonLdText.length === 0
      ? makeFactor(
          "Structured Data Alignment",
          0,
          6,
          "No JSON-LD text fields to align",
          "neutral",
        )
      : alignmentFactor(
          "Structured Data Alignment",
          6,
          jsonLdText,
          salientItems,
          salient,
          "JSON-LD fields",
        ),
  );

  return buildCategoryOutput("structuralAlignment", factors, {});
}

function alignmentFactor(
  name:
    | "Title Entity Alignment"
    | "Meta Description Alignment"
    | "Heading Entity Alignment"
    | "Structured Data Alignment",
  maxScore: number,
  fieldText: string,
  salientItems: string[],
  salient: SalientTermsType,
  fieldLabel: string,
): FactorResultType {
  if (salientItems.length === 0) {
    return makeFactor(
      name,
      0,
      maxScore,
      "No salient body terms to align against",
      "neutral",
    );
  }
  if (fieldText.trim().length === 0) {
    return makeFactor(name, 0, maxScore, `No ${fieldLabel} present`);
  }

  const coverage = coverageOfItems(fieldText, salientItems);
  const numbersCovered =
    salient.numbers.length > 0 &&
    coverageOfItems(fieldText, salient.numbers) > 0;
  const score = thresholdScore(
    coverage,
    [
      [0.6, Infinity, maxScore],
      [0.35, 0.6, Math.round(maxScore * 0.6)],
      [0.15, 0.35, Math.round(maxScore * 0.3)],
    ],
    "range",
  );

  return makeFactor(
    name,
    score,
    maxScore,
    `${Math.round(coverage * 100)}% of the body's key terms appear in the ${fieldLabel}${numbersCovered ? ", key figures included" : ""}`,
  );
}

const JSON_LD_TEXT_FIELDS = [
  "headline",
  "description",
  "about",
  "keywords",
  "name",
] as const;

function structuredDataText(page: ExtractedPageType): string {
  return parseJsonLdObjects(page.$)
    .flatMap((schema) =>
      JSON_LD_TEXT_FIELDS.map((field) => textValueOf(schema[field])),
    )
    .filter((value) => value.length > 0)
    .join(" ");
}

function textValueOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string").join(" ");
  }
  if (typeof value === "object" && value !== null && "name" in value) {
    return textValueOf((value as { name: unknown }).name);
  }
  return "";
}
