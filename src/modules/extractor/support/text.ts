import type { CheerioAPI } from "cheerio";

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 5);
}

export function extractCleanText($: CheerioAPI): string {
  return normalizeWhitespace($("body").text());
}
