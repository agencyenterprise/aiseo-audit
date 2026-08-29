import { extractPage } from "../../src/modules/extractor/service.js";

export function buildPage(html: string, url = "https://example.com/test") {
  return extractPage(html, url);
}

export const paragraph = (words: number) =>
  `<p>${"word ".repeat(words).trim()}</p>`;
