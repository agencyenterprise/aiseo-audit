import type { ExtractedPageType } from "../../extractor/schema.js";
import { CATEGORY_DISPLAY_NAMES } from "../constants.js";
import type { CategoryAuditOutput, FactorResultType } from "../schema.js";
import { parseJsonLdObjects } from "../support/dom.js";
import {
  measureEntityConsistency,
  resolveEntityName,
} from "../support/entity.js";
import { evaluateFreshness } from "../support/freshness.js";
import { AUTHOR_SELECTORS, DATE_SELECTORS } from "../support/patterns.js";
import { evaluateSchemaCompleteness } from "../support/schema-analysis.js";
import { makeFactor, maxFactors, sumFactors } from "../support/scoring.js";

export function auditAuthorityContext(
  page: ExtractedPageType,
): CategoryAuditOutput {
  const $ = page.$;
  const factors: FactorResultType[] = [];
  const rawData: CategoryAuditOutput["rawData"] = {};

  let authorFound = false;
  let authorName = "";
  for (const selector of AUTHOR_SELECTORS) {
    const elem = $(selector).first();
    if (elem.length) {
      authorFound = true;
      authorName = elem.text().trim() || elem.attr("content") || "Found";
      break;
    }
  }
  factors.push(
    makeFactor(
      "Author Attribution",
      authorFound ? 10 : 0,
      10,
      authorFound ? authorName : "Not found",
    ),
  );

  const hasOrgSchema =
    page.html.includes('"@type":"Organization"') ||
    page.html.includes('"@type": "Organization"');
  const ogSiteName = $('meta[property="og:site_name"]').attr("content") || "";
  const orgFound = hasOrgSchema || ogSiteName.length > 0;
  factors.push(
    makeFactor(
      "Organization Identity",
      orgFound ? 10 : 0,
      10,
      orgFound ? ogSiteName || "Schema found" : "Not found",
    ),
  );

  const aboutLink =
    $('a[href*="about"], a[href*="team"], a[href*="company"]').length > 0;
  const contactLink = $('a[href*="contact"]').length > 0;
  const contactScore =
    aboutLink && contactLink ? 10 : aboutLink || contactLink ? 5 : 0;
  factors.push(
    makeFactor(
      "Contact/About Links",
      contactScore,
      10,
      `${aboutLink ? "About" : ""}${aboutLink && contactLink ? " + " : ""}${contactLink ? "Contact" : ""}${!aboutLink && !contactLink ? "Not found" : ""}`,
    ),
  );

  let dateFound = false;
  let dateValue = "";
  for (const selector of DATE_SELECTORS) {
    const elem = $(selector).first();
    if (elem.length) {
      dateFound = true;
      dateValue =
        elem.attr("datetime") || elem.attr("content") || elem.text().trim();
      break;
    }
  }
  factors.push(
    makeFactor(
      "Publication Date",
      dateFound ? 8 : 0,
      8,
      dateFound ? dateValue : "Not found",
    ),
  );

  const freshness = evaluateFreshness(page.$);
  let freshScore = 0;
  if (freshness.ageInMonths !== null) {
    if (freshness.ageInMonths <= 6) freshScore = 12;
    else if (freshness.ageInMonths <= 12) freshScore = 9;
    else if (freshness.ageInMonths <= 24) freshScore = 5;
    else freshScore = 2;
    if (freshness.hasModifiedDate && freshScore < 12)
      freshScore = Math.min(freshScore + 2, 12);
  }
  factors.push(
    makeFactor(
      "Content Freshness",
      freshScore,
      12,
      freshness.ageInMonths !== null
        ? `${freshness.ageInMonths} months old${freshness.hasModifiedDate ? ", modified date present" : ""}`
        : "No parseable date found",
    ),
  );

  rawData.freshness = freshness;

  const jsonLdScripts = $('script[type="application/ld+json"]');
  const structuredDataTypes: string[] = [];
  jsonLdScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      if (data["@type"]) structuredDataTypes.push(data["@type"]);
    } catch {}
  });

  const ogTags = ["og:title", "og:description", "og:image", "og:type"];
  const foundOgTags = ogTags.filter(
    (tag) => $(`meta[property="${tag}"]`).length > 0,
  );
  const canonical = $('link[rel="canonical"]').attr("href");

  let structuredScore = 0;
  if (structuredDataTypes.length > 0) structuredScore += 4;
  if (foundOgTags.length >= 3) structuredScore += 4;
  else if (foundOgTags.length > 0) structuredScore += 2;
  if (canonical) structuredScore += 4;

  rawData.structuredDataTypes = structuredDataTypes;

  factors.push(
    makeFactor(
      "Structured Data",
      structuredScore,
      12,
      `${structuredDataTypes.length > 0 ? structuredDataTypes.join(", ") : "No JSON-LD"}, ${foundOgTags.length}/4 OG tags${canonical ? ", canonical" : ""}`,
    ),
  );

  const schemaObjects = parseJsonLdObjects(page.$);
  const completeness = evaluateSchemaCompleteness(schemaObjects);
  const schemaCompleteScore =
    completeness.totalTypes === 0
      ? 0
      : completeness.avgCompleteness >= 0.8
        ? 10
        : completeness.avgCompleteness >= 0.5
          ? 7
          : completeness.avgCompleteness > 0
            ? 4
            : 0;
  factors.push(
    makeFactor(
      "Schema Completeness",
      schemaCompleteScore,
      10,
      completeness.totalTypes > 0
        ? `${completeness.totalTypes} schema types, ${Math.round(completeness.avgCompleteness * 100)}% complete`
        : "No recognized JSON-LD schemas found",
      completeness.totalTypes === 0 ? "neutral" : undefined,
    ),
  );

  rawData.schemaCompleteness = completeness;

  const entityName = resolveEntityName(page.$);
  const consistency = measureEntityConsistency(page.$, page.title, entityName);
  factors.push(
    makeFactor(
      "Entity Consistency",
      consistency.score,
      10,
      entityName
        ? `"${entityName}" found in ${consistency.surfacesFound}/${consistency.surfacesChecked} surfaces`
        : "No identifiable entity name",
      !entityName ? "neutral" : undefined,
    ),
  );

  rawData.entityConsistency = {
    entityName: entityName || null,
    surfacesFound: consistency.surfacesFound,
    surfacesChecked: consistency.surfacesChecked,
  };

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.authorityContext,
      key: "authorityContext",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData,
  };
}
