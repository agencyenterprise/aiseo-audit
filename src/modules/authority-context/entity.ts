import type { CheerioAPI } from "cheerio";
import { thresholdScore } from "../scoring/service.js";
import { parseJsonLdObjects, schemaTypesOf } from "./json-ld.js";

export function resolveEntityName($: CheerioAPI): string | null {
  const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim();
  if (ogSiteName) return ogSiteName;

  let orgName: string | null = null;
  let publisherName: string | null = null;
  for (const schema of parseJsonLdObjects($)) {
    if (
      !orgName &&
      schemaTypesOf(schema).includes("Organization") &&
      typeof schema.name === "string"
    ) {
      orgName = schema.name.trim();
    }
    const publisher = schema.publisher as { name?: unknown } | undefined;
    if (!publisherName && typeof publisher?.name === "string") {
      publisherName = publisher.name.trim();
    }
  }

  return orgName || publisherName || null;
}

export function measureEntityConsistency(
  $: CheerioAPI,
  pageTitle: string,
  entityName: string | null,
): { score: number; surfacesFound: number; surfacesChecked: number } {
  if (!entityName) return { score: 0, surfacesFound: 0, surfacesChecked: 0 };

  const nameLower = entityName.toLowerCase();
  const surfacesChecked = 4;
  let surfacesFound = 0;

  if (pageTitle.toLowerCase().includes(nameLower)) surfacesFound++;

  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  if (ogTitle.toLowerCase().includes(nameLower)) surfacesFound++;

  const footerText = $("footer").text().toLowerCase();
  if (footerText.includes(nameLower)) surfacesFound++;

  const copyrightText = $('[class*="copyright"], [class*="legal"]')
    .text()
    .toLowerCase();
  const headerText = $("header").text().toLowerCase();
  if (copyrightText.includes(nameLower) || headerText.includes(nameLower))
    surfacesFound++;

  const score = thresholdScore(surfacesFound, [
    [4, 10],
    [3, 7],
    [2, 4],
    [1, 2],
  ]);

  return { score, surfacesFound, surfacesChecked };
}
