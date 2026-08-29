import type { CheerioAPI } from "cheerio";

export type TimeSensitivityResultType = {
  timeSensitive: boolean;
  signals: string[];
};

const TIME_SENSITIVE_SCHEMA_TYPES = new Set([
  "NewsArticle",
  "Event",
  "LiveBlogPosting",
]);

const YEAR_TOKEN = /\b20\d\d\b/;
const TREND_VOCABULARY =
  /\b(?:latest|new|updated|current|today|this\s+year|trends?)\b/i;
const TIME_SENSITIVE_URL_SEGMENT = /\/(?:news|blog)(?:\/|$)/i;

export function detectTimeSensitivity(
  $: CheerioAPI,
  url: string,
  title: string,
  metaDescription: string,
  structuredDataTypes: string[],
): TimeSensitivityResultType {
  const signals: string[] = [];

  const timeSensitiveSchema = structuredDataTypes.find((type) =>
    TIME_SENSITIVE_SCHEMA_TYPES.has(type),
  );
  if (timeSensitiveSchema) signals.push(`${timeSensitiveSchema} schema`);

  const headline = `${title} ${$("h1").first().text()}`;
  if (YEAR_TOKEN.test(headline)) signals.push("year in title or H1");

  if (TREND_VOCABULARY.test(`${title} ${metaDescription}`)) {
    signals.push("trend vocabulary in title or description");
  }

  if (TIME_SENSITIVE_URL_SEGMENT.test(url)) {
    signals.push("news or blog URL path");
  }

  return { timeSensitive: signals.length > 0, signals };
}
