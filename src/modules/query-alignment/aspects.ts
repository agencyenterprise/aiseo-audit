import BM25 from "okapibm25";
import type { CheerioAPI } from "cheerio";
import { extractEntities } from "../nlp/service.js";
import { queryContentTerms } from "./coverage.js";

export type AspectCoverageType = {
  aspects: string[];
  coveredAspects: string[];
};

const SECTION_SCORE_FLOOR = 0.5;

export function measureAspectCoverage(
  query: string,
  $: CheerioAPI,
  bodyText: string,
): AspectCoverageType {
  const aspects = queryAspects(query);
  const sections = headedSections($, bodyText);
  if (aspects.length === 0 || sections.length === 0) {
    return { aspects, coveredAspects: [] };
  }

  const coveredAspects = aspects.filter((aspect) => {
    const scores = BM25(sections, queryContentTerms(aspect)) as number[];
    return Math.max(...scores) >= SECTION_SCORE_FLOOR;
  });

  return { aspects, coveredAspects };
}

function queryAspects(query: string): string[] {
  const entities = extractEntities(query);
  const named = [
    ...entities.people,
    ...entities.organizations,
    ...entities.places,
    ...entities.topics,
  ];
  const fallbackTerms = named.length > 0 ? [] : queryContentTerms(query);
  return [...new Set([...named, ...fallbackTerms])];
}

function headedSections($: CheerioAPI, bodyText: string): string[] {
  const sections: string[] = [];

  $("h1, h2, h3, h4, h5, h6").each((_, heading) => {
    const parts: string[] = [$(heading).text().trim()];
    let node = $(heading).next();
    while (node.length) {
      const tag = node.prop("tagName")?.toLowerCase() ?? "";
      if (/^h[1-6]$/.test(tag) || node.find("h1,h2,h3,h4,h5,h6").length > 0) {
        break;
      }
      parts.push(node.text().trim());
      node = node.next();
    }
    const section = parts.filter(Boolean).join(" ");
    if (section.length > 0) sections.push(section);
  });

  return sections.length > 0 ? sections : [bodyText];
}
