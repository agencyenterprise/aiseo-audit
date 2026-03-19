import type { CheerioAPI } from "cheerio";
import type { SectionLengthResultType } from "../audits/schema.js";

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
