import type { CheerioAPI } from "cheerio";
import type { FreshnessResultType } from "../audits/schema.js";
import {
  firstSelectorValue,
  MODIFIED_DATE_SELECTORS,
  PUBLISH_DATE_SELECTORS,
} from "./selectors.js";

export function evaluateFreshness($: CheerioAPI): FreshnessResultType {
  const modifiedDate = firstSelectorValue($, MODIFIED_DATE_SELECTORS);
  const publishDate = firstSelectorValue($, PUBLISH_DATE_SELECTORS);

  const mostRecent = modifiedDate || publishDate;
  let ageInMonths: number | null = null;

  if (mostRecent) {
    const parsed = new Date(mostRecent);
    if (!isNaN(parsed.getTime())) {
      const now = new Date();
      ageInMonths =
        (now.getFullYear() - parsed.getFullYear()) * 12 +
        (now.getMonth() - parsed.getMonth());
    }
  }

  return {
    publishDate,
    modifiedDate,
    ageInMonths,
    hasModifiedDate: !!modifiedDate,
  };
}
