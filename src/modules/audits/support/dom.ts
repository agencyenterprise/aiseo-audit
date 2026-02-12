import type { CheerioAPI } from "cheerio";
import type { SectionLengthResultType } from "../schema.js";
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

export function measureSectionLengths($: CheerioAPI): SectionLengthResultType {
  const headings = $("h1, h2, h3, h4, h5, h6");
  if (headings.length === 0)
    return { sectionCount: 0, avgWordsPerSection: 0, sections: [] };

  const sections: number[] = [];

  headings.each((_, el) => {
    let words = 0;
    let sibling = $(el).next();

    while (sibling.length && !sibling.is("h1, h2, h3, h4, h5, h6")) {
      const text = sibling.text().trim();
      words += text.split(/\s+/).filter((w) => w.length > 0).length;
      sibling = sibling.next();
    }

    if (words > 0) sections.push(words);
  });

  const avg =
    sections.length > 0
      ? Math.round(sections.reduce((a, b) => a + b, 0) / sections.length)
      : 0;

  return { sectionCount: sections.length, avgWordsPerSection: avg, sections };
}

export function parseJsonLdObjects($: CheerioAPI): Record<string, unknown>[] {
  const objects: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      if (Array.isArray(data)) objects.push(...data);
      else objects.push(data);
    } catch {}
  });
  return objects;
}
