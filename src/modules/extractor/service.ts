import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { countSentences, countWords } from "../../utils/strings.js";
import { getDomain, isSameSite } from "../../utils/url.js";
import type {
  ExternalLinkType,
  ExtractedPageType,
  PageStatsType,
} from "./schema.js";
import { removeBoilerplate } from "./support/boilerplate.js";
import { extractCleanText } from "./support/text.js";

const GENERIC_ALT_VALUES = new Set([
  "image",
  "photo",
  "logo",
  "icon",
  "picture",
  "img",
  "graphic",
  "thumbnail",
]);

const MAX_LINK_TEXT_LENGTH = 50;
const MAX_ALT_TEXT_LENGTH = 200;

export function extractPage(html: string, url: string): ExtractedPageType {
  const $ = cheerio.load(html);
  const rawText = rawTextOf(html);
  const cleanText = cleanTextOf(html);
  const externalLinks = collectExternalLinks($, url);

  const stats: PageStatsType = {
    wordCount: countWords(cleanText),
    sentenceCount: countSentences(cleanText),
    paragraphCount: $("p").length,
    headingCount: $("h1, h2, h3, h4, h5, h6").length,
    h1Count: $("h1").length,
    h2Count: $("h2").length,
    h3Count: $("h3").length,
    linkCount: $("a[href]").length,
    externalLinkCount: externalLinks.length,
    imageCount: $("img").length,
    imagesWithAlt: countImagesWithMeaningfulAlt($),
    listCount: $("ul, ol").length,
    listItemCount: $("li").length,
    tableCount: $("table").length,
    boilerplateRatio: boilerplateRatioOf(rawText, cleanText),
    rawByteLength: Buffer.byteLength(html, "utf-8"),
    cleanTextLength: cleanText.length,
  };

  return {
    url,
    html,
    cleanText,
    title: extractTitle($),
    metaDescription: extractMetaDescription($),
    stats,
    $,
    externalLinks,
  };
}

function rawTextOf(html: string): string {
  const $raw = cheerio.load(html);
  $raw("script, style, noscript").remove();
  return $raw("body").text().replace(/\s+/g, " ").trim();
}

function cleanTextOf(html: string): string {
  const $clean = cheerio.load(html);
  removeBoilerplate($clean);
  return extractCleanText($clean);
}

function collectExternalLinks($: CheerioAPI, url: string): ExternalLinkType[] {
  const pageDomain = getDomain(url);
  const externalLinks: ExternalLinkType[] = [];

  $('a[href^="http"]').each((_, el) => {
    const href = $(el).attr("href") as string;
    const linkDomain = getDomain(href);
    if (linkDomain && pageDomain && !isSameSite(linkDomain, pageDomain)) {
      externalLinks.push({
        url: href,
        text: $(el).text().trim().substring(0, MAX_LINK_TEXT_LENGTH),
      });
    }
  });

  return externalLinks;
}

function countImagesWithMeaningfulAlt($: CheerioAPI): number {
  let count = 0;
  $("img").each((_, el) => {
    const alt = $(el).attr("alt")?.trim() ?? "";
    if (isMeaningfulAltText(alt)) count++;
  });
  return count;
}

function isMeaningfulAltText(alt: string): boolean {
  return (
    alt.length > 0 &&
    alt.length < MAX_ALT_TEXT_LENGTH &&
    !GENERIC_ALT_VALUES.has(alt.toLowerCase())
  );
}

function boilerplateRatioOf(rawText: string, cleanText: string): number {
  if (rawText.length === 0) return 0;
  return Math.max(0, Math.min(1, 1 - cleanText.length / rawText.length));
}

function extractTitle($: CheerioAPI): string {
  return (
    $("title").text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    ""
  );
}

function extractMetaDescription($: CheerioAPI): string {
  return (
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    ""
  );
}
