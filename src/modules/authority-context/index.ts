import type { ExtractedPageType } from "../extractor/schema.js";
import { buildCategoryOutput } from "../audits/category.js";
import { makeFactor, thresholdScore } from "../scoring/service.js";
import type {
  CategoryAuditOutputType,
  FactorResultType,
} from "../audits/schema.js";
import { parseJsonLdObjects, schemaTypesOf } from "./json-ld.js";
import { measureEntityConsistency, resolveEntityName } from "./entity.js";
import { evaluateFreshness } from "./freshness.js";
import {
  AUTHOR_SELECTORS,
  firstSelectorValue,
  PUBLISH_DATE_SELECTORS,
} from "./selectors.js";
import { evaluateSchemaCompleteness } from "./schema-analysis.js";

const MAX_AUTHOR_NAME_LENGTH = 80;

function hasNavLink(
  $: ExtractedPageType["$"],
  words: string[],
  extraSelector?: string,
): boolean {
  if (extraSelector && $(extraSelector).length > 0) return true;
  let found = false;
  $("a[href]").each((_, el) => {
    if (found) return;
    const href = ($(el).attr("href") ?? "").toLowerCase();
    const linkText = $(el).text().trim().toLowerCase();
    found =
      pathSegmentsOf(href).some((segment) =>
        words.some((word) => segment.startsWith(word)),
      ) ||
      words.some(
        (word) => linkText === word || linkText.startsWith(`${word} `),
      );
  });
  return found;
}

function pathSegmentsOf(href: string): string[] {
  const path = href.replace(/^https?:\/\/[^/]+/, "").split(/[?#]/)[0];
  return path.split("/").filter(Boolean);
}

export function auditAuthorityContext(
  page: ExtractedPageType,
): CategoryAuditOutputType {
  const $ = page.$;
  const factors: FactorResultType[] = [];
  const rawData: CategoryAuditOutputType["rawData"] = {};
  const schemaObjects = parseJsonLdObjects($);

  const authorName = firstSelectorValue($, AUTHOR_SELECTORS);
  factors.push(
    makeFactor(
      "Author Attribution",
      authorName ? 10 : 0,
      10,
      authorName ? authorName.slice(0, MAX_AUTHOR_NAME_LENGTH) : "Not found",
    ),
  );

  const hasOrgSchema = schemaObjects.some((schema) =>
    schemaTypesOf(schema).includes("Organization"),
  );
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

  const aboutLink = hasNavLink($, ["about", "team", "company"]);
  const contactLink = hasNavLink($, ["contact"], 'a[href^="mailto:"]');
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

  const publishDateValue = firstSelectorValue($, PUBLISH_DATE_SELECTORS);
  factors.push(
    makeFactor(
      "Publication Date",
      publishDateValue ? 8 : 0,
      8,
      publishDateValue ?? "Not found",
    ),
  );

  const freshness = evaluateFreshness(page.$);
  let freshScore = 0;
  if (freshness.ageInMonths !== null) {
    freshScore = thresholdScore(
      freshness.ageInMonths,
      [
        [6, 12],
        [12, 9],
        [24, 5],
      ],
      "lower",
    );
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

  const structuredDataTypes = schemaObjects.flatMap(schemaTypesOf);

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

  const completeness = evaluateSchemaCompleteness(schemaObjects);
  const schemaCompleteScore =
    completeness.totalTypes === 0
      ? 0
      : thresholdScore(completeness.avgCompleteness, [
          [0.8, 10],
          [0.5, 7],
          [0.01, 4],
        ]);
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

  return buildCategoryOutput("authorityContext", factors, rawData);
}
