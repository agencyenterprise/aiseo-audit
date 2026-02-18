import type { CheerioAPI } from "cheerio";

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const BLOCK_ELEMENTS =
  "p,div,td,th,li,h1,h2,h3,h4,h5,h6,dt,dd,br,blockquote,section,article";

export function extractCleanText($: CheerioAPI): string {
  $(BLOCK_ELEMENTS).each((_, el) => {
    $(el).append(" ");
  });
  return normalizeWhitespace($("body").text());
}
