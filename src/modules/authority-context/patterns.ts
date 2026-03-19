export const AUTHOR_SELECTORS = [
  '[rel="author"]',
  ".author",
  ".byline",
  '[itemprop="author"]',
  ".post-author",
  ".entry-author",
  'meta[name="author"]',
];

export const DATE_SELECTORS = [
  "time[datetime]",
  '[itemprop="datePublished"]',
  '[itemprop="dateModified"]',
  ".published",
  ".post-date",
  ".entry-date",
  'meta[property="article:published_time"]',
  'meta[property="article:modified_time"]',
];

export const MODIFIED_DATE_SELECTORS = [
  '[itemprop="dateModified"]',
  'meta[property="article:modified_time"]',
];

export const PUBLISH_DATE_SELECTORS = [
  "time[datetime]",
  '[itemprop="datePublished"]',
  'meta[property="article:published_time"]',
];
