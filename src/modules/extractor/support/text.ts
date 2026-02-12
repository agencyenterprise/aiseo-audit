import type { CheerioAPI } from "cheerio";

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function extractCleanText($: CheerioAPI): string {
  return normalizeWhitespace($("body").text());
}
