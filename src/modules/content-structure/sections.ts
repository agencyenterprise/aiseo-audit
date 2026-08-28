import type { CheerioAPI } from "cheerio";
import { countWords } from "../../utils/strings.js";
import type { SectionLengthResultType } from "../audits/schema.js";

export function measureSectionLengths($: CheerioAPI): SectionLengthResultType {
  const headings = $("h1, h2, h3, h4, h5, h6");
  if (headings.length === 0)
    return { sectionCount: 0, avgWordsPerSection: 0, sections: [] };

  const sections: number[] = [];

  headings.each((_, el) => {
    let words = 0;
    let sibling = $(el).next();

    while (
      sibling.length &&
      !sibling.is("h1, h2, h3, h4, h5, h6") &&
      !containsAHeading(sibling)
    ) {
      words += countWords(sibling.text().trim());
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

function containsAHeading(node: ReturnType<CheerioAPI>): boolean {
  return node.find("h1, h2, h3, h4, h5, h6").length > 0;
}
