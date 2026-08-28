import type { CheerioAPI } from "cheerio";
import { QUESTION_HEADING_PATTERN } from "./patterns.js";

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const MAX_CAPSULE_SENTENCE_LENGTH = 200;

type CheerioSelection = ReturnType<CheerioAPI>;

export function detectAnswerCapsules($: CheerioAPI): {
  total: number;
  withCapsule: number;
} {
  let total = 0;
  let withCapsule = 0;

  $("h2").each((_, el) => {
    const headingText = $(el).text().trim();
    if (!isQuestionHeading(headingText)) return;

    total++;
    if (hasCapsuleAnswer($, $(el))) withCapsule++;
  });

  return { total, withCapsule };
}

function isQuestionHeading(headingText: string): boolean {
  return (
    headingText.includes("?") || QUESTION_HEADING_PATTERN.test(headingText)
  );
}

function hasCapsuleAnswer($: CheerioAPI, heading: CheerioSelection): boolean {
  const answerParagraph = findAnswerParagraph($, heading);
  if (!answerParagraph) return false;

  const firstSentence = firstSentenceOf(answerParagraph.text().trim());
  return (
    firstSentence.length > 0 &&
    firstSentence.length <= MAX_CAPSULE_SENTENCE_LENGTH
  );
}

function findAnswerParagraph(
  $: CheerioAPI,
  heading: CheerioSelection,
): CheerioSelection | null {
  let node = heading.next();
  while (node.length) {
    const tag = node.prop("tagName")?.toLowerCase() ?? "";
    if (HEADING_TAGS.has(tag)) return null;
    if (tag === "p") return node;
    const paragraphInsideWrapper = node.find("p").first();
    if (paragraphInsideWrapper.length) return paragraphInsideWrapper;
    node = node.next();
  }
  return null;
}

function firstSentenceOf(text: string): string {
  const endPunctuationFollowedBySpaceOrEnd = /[.!?](?:\s|$)/;
  return text.split(endPunctuationFollowedBySpaceOrEnd)[0] || "";
}
