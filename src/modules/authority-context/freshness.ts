import type { CheerioAPI } from "cheerio";
import type { FreshnessResultType } from "../audits/schema.js";
import {
  firstSelectorValue,
  MODIFIED_DATE_SELECTORS,
  PUBLISH_DATE_SELECTORS,
} from "./selectors.js";

export function evaluateFreshness(
  $: CheerioAPI,
  evaluationDate = new Date(),
): FreshnessResultType {
  const modifiedDate = firstSelectorValue($, MODIFIED_DATE_SELECTORS);
  const publishDate = firstSelectorValue($, PUBLISH_DATE_SELECTORS);

  const mostRecent = modifiedDate || publishDate;
  let ageInMonths: number | null = null;

  if (mostRecent) {
    const parsed = new Date(mostRecent);
    if (!isNaN(parsed.getTime())) {
      ageInMonths = Math.max(
        0,
        (evaluationDate.getUTCFullYear() - parsed.getUTCFullYear()) * 12 +
          (evaluationDate.getUTCMonth() - parsed.getUTCMonth()),
      );
    }
  }

  return {
    publishDate,
    modifiedDate,
    ageInMonths,
    hasModifiedDate: !!modifiedDate,
  };
}
