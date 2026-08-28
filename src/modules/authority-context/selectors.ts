import type { CheerioAPI } from "cheerio";

export const AUTHOR_SELECTORS = [
  '[rel="author"]',
  ".author",
  ".byline",
  '[itemprop="author"]',
  ".post-author",
  ".entry-author",
  'meta[name="author"]',
];

export const MODIFIED_DATE_SELECTORS = [
  '[itemprop="dateModified"]',
  'meta[property="article:modified_time"]',
];

export const PUBLISH_DATE_SELECTORS = [
  "time[datetime]",
  '[itemprop="datePublished"]',
  ".published",
  ".post-date",
  ".entry-date",
  'meta[property="article:published_time"]',
];

export function firstSelectorValue(
  $: CheerioAPI,
  selectors: string[],
): string | null {
  for (const selector of selectors) {
    const elem = $(selector).first();
    if (elem.length) {
      return (
        elem.attr("datetime") ||
        elem.attr("content") ||
        elem.text().trim() ||
        null
      );
    }
  }
  return null;
}
