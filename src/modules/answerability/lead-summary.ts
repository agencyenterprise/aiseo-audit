import type { CheerioAPI } from "cheerio";
import { countWords } from "../../utils/strings.js";
import { textCoversItem } from "../nlp/support/salience.js";
import { DIRECT_ANSWER_PATTERNS } from "./patterns.js";

export type LeadSummaryResultType = {
  hasIntroParagraphUnderH1: boolean;
  hasExplicitSummaryMarker: boolean;
  firstParagraphStatesMainClaim: boolean;
};

export const LEAD_SUMMARY_POINTS = {
  introParagraphUnderH1: 5,
  explicitSummaryMarker: 5,
  firstParagraphStatesMainClaim: 3,
} as const;

const LEAD_WINDOW_WORD_COUNT = 150;
const INTRO_PARAGRAPH_MIN_WORDS = 30;
const INTRO_PARAGRAPH_MAX_WORDS = 150;

const EXPLICIT_SUMMARY_MARKER =
  /\b(?:tl;?dr|key\s+takeaways?|overview|at\s+a\s+glance|summary|in\s+brief)\b/i;

export function detectLeadSummary(
  $: CheerioAPI,
  cleanText: string,
  salientEntities: string[],
): LeadSummaryResultType {
  const leadWindow = firstWords(cleanText, LEAD_WINDOW_WORD_COUNT);
  const introParagraph = paragraphDirectlyUnderH1($);

  return {
    hasIntroParagraphUnderH1: introParagraphHasSummaryLength(introParagraph),
    hasExplicitSummaryMarker:
      EXPLICIT_SUMMARY_MARKER.test(leadWindow) ||
      anyEarlyHeadingIsSummaryMarker($),
    firstParagraphStatesMainClaim: statesMainClaim(
      introParagraph ?? firstParagraphText($),
      salientEntities,
    ),
  };
}

export function scoreLeadSummary(result: LeadSummaryResultType): number {
  let score = 0;
  if (result.hasIntroParagraphUnderH1) {
    score += LEAD_SUMMARY_POINTS.introParagraphUnderH1;
  }
  if (result.hasExplicitSummaryMarker) {
    score += LEAD_SUMMARY_POINTS.explicitSummaryMarker;
  }
  if (result.firstParagraphStatesMainClaim) {
    score += LEAD_SUMMARY_POINTS.firstParagraphStatesMainClaim;
  }
  return score;
}

function firstWords(text: string, count: number): string {
  return text.split(/\s+/).slice(0, count).join(" ");
}

function paragraphDirectlyUnderH1($: CheerioAPI): string | null {
  const h1 = $("h1").first();
  if (h1.length === 0) return null;

  let node = h1.next();
  while (node.length) {
    const tag = node.prop("tagName")?.toLowerCase() ?? "";
    if (/^h[1-6]$/.test(tag)) return null;
    if (tag === "p") return node.text().trim();
    const nestedParagraph = node.find("p").first();
    if (nestedParagraph.length) return nestedParagraph.text().trim();
    node = node.next();
  }
  return null;
}

function introParagraphHasSummaryLength(paragraph: string | null): boolean {
  if (!paragraph) return false;
  const words = countWords(paragraph);
  return (
    words >= INTRO_PARAGRAPH_MIN_WORDS && words <= INTRO_PARAGRAPH_MAX_WORDS
  );
}

function anyEarlyHeadingIsSummaryMarker($: CheerioAPI): boolean {
  const earlyHeadings = $("h2, h3").slice(0, 2);
  let found = false;
  earlyHeadings.each((_, el) => {
    if (EXPLICIT_SUMMARY_MARKER.test($(el).text())) found = true;
  });
  return found;
}

function firstParagraphText($: CheerioAPI): string | null {
  const paragraph = $("p").first();
  return paragraph.length ? paragraph.text().trim() : null;
}

function statesMainClaim(
  paragraph: string | null,
  salientEntities: string[],
): boolean {
  if (!paragraph) return false;
  const mentionsSalientEntity = salientEntities.some((entity) =>
    textCoversItem(paragraph, entity),
  );
  const assertsDirectly = DIRECT_ANSWER_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(paragraph);
  });
  return mentionsSalientEntity && assertsDirectly;
}
