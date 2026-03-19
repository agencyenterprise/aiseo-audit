import type { CheerioAPI } from "cheerio";
import { QUESTION_HEADING_PATTERN } from "./patterns.js";

export function detectAnswerCapsules($: CheerioAPI): {
  total: number;
  withCapsule: number;
} {
  let total = 0;
  let withCapsule = 0;

  $("h2").each((_, el) => {
    const headingText = $(el).text().trim();
    const isQuestion =
      headingText.includes("?") || QUESTION_HEADING_PATTERN.test(headingText);
    if (!isQuestion) return;

    total++;
    const nextP = $(el).nextAll("p").first();
    if (!nextP.length) return;

    const pText = nextP.text().trim();
    const firstSentence = pText.split(/[.!?]/)[0] || "";
    if (firstSentence.length > 0 && firstSentence.length <= 200) {
      withCapsule++;
    }
  });

  return { total, withCapsule };
}
