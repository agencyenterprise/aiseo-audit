import type { CheerioAPI } from "cheerio";
import type { FreshnessResultType } from "../schema.js";
import { MODIFIED_DATE_SELECTORS, PUBLISH_DATE_SELECTORS } from "./patterns.js";

export function evaluateFreshness($: CheerioAPI): FreshnessResultType {
  let modifiedDate: string | null = null;
  let publishDate: string | null = null;

  for (const sel of MODIFIED_DATE_SELECTORS) {
    const el = $(sel).first();
    if (el.length) {
      modifiedDate =
        el.attr("datetime") || el.attr("content") || el.text().trim();
      break;
    }
  }

  for (const sel of PUBLISH_DATE_SELECTORS) {
    const el = $(sel).first();
    if (el.length) {
      publishDate =
        el.attr("datetime") || el.attr("content") || el.text().trim();
      break;
    }
  }

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
