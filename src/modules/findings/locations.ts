import type { FactorNameType } from "../audits/factor-names.js";
import type { ExtractedPageType } from "../extractor/schema.js";
import { measureHedging } from "../grounding-signals/hedging.js";
import { avgSentenceLength } from "../nlp/service.js";
import type { FindingLocationType } from "./schema.js";
import {
  MODIFIED_DATE_SELECTORS,
  PUBLISH_DATE_SELECTORS,
} from "../authority-context/selectors.js";

type PageNode = ReturnType<typeof matchingElements>[number];

const FACTOR_SELECTORS: Partial<Record<FactorNameType, string>> = {
  "Title Entity Alignment": "title",
  "Meta Description Alignment": 'meta[name="description"]',
  "Lead Summary": "main p, article p, body > p",
};

export function locateFactor(
  page: ExtractedPageType,
  factor: FactorNameType,
): FindingLocationType {
  if (
    ["Fetch Success", "AI Crawler Access", "LLMs.txt Presence"].includes(factor)
  ) {
    return { url: page.url, scope: "network" };
  }
  let element: PageNode | undefined;
  if (factor === "Content Freshness" || factor === "Date Markup") {
    const selectors =
      factor === "Content Freshness"
        ? [...MODIFIED_DATE_SELECTORS, ...PUBLISH_DATE_SELECTORS]
        : PUBLISH_DATE_SELECTORS;
    element = selectors
      .map((selector) => matchingElements(page, selector)[0])
      .find(Boolean);
  } else if (factor === "Hedged Language") {
    element = contentParagraphs(page).find(
      (el) => measureHedging(page.$(el).text()).hedgedSentenceCount > 0,
    );
  } else if (factor === "Sentence Length") {
    element = contentParagraphs(page).find(
      (el) => avgSentenceLength(page.$(el).text()) > 35,
    );
  } else if (FACTOR_SELECTORS[factor]) {
    element = matchingElements(page, FACTOR_SELECTORS[factor]!)[0];
  }
  if (!element) return { url: page.url, scope: "document" };
  const selected = page.$(element);
  const excerpt = (
    selected.attr("content") ??
    selected.attr("datetime") ??
    selected.text()
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
  return {
    url: page.url,
    scope: "element",
    selector: selectorFor(page, element),
    ...(excerpt ? { excerpt } : {}),
  };
}

function contentParagraphs(page: ExtractedPageType): PageNode[] {
  return page
    .$("p")
    .toArray()
    .filter(
      (el) => page.$(el).parents("nav, header, footer, aside").length === 0,
    );
}

function selectorFor(page: ExtractedPageType, element: PageNode): string {
  const parts: string[] = [];
  let current = page.$(element);
  while (current.length && current.get(0)?.type !== "root") {
    const node = current.get(0);
    if (!node || !("tagName" in node)) break;
    const tag = node.tagName;
    const position = current.prevAll(tag).length + 1;
    parts.unshift(`${tag}:nth-of-type(${position})`);
    current = current.parent();
  }
  return parts.join(" > ");
}

function matchingElements(page: ExtractedPageType, selector: string) {
  return page.$(selector).toArray();
}
