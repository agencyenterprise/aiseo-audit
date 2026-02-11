import type { CheerioAPI } from "cheerio";
import compromise from "compromise";
import { countSyllables } from "../../../utils/strings.js";
import type {
  CrawlerAccessResultType,
  ExtractedEntitiesType,
  FreshnessResultType,
  SectionLengthResultType,
} from "../schema.js";
import {
  AI_CRAWLERS,
  MODIFIED_DATE_SELECTORS,
  PUBLISH_DATE_SELECTORS,
  QUESTION_HEADING_PATTERN,
} from "./patterns.js";

export function extractEntities(text: string): ExtractedEntitiesType {
  const doc = compromise(text);

  const people = [...new Set(doc.people().out("array") as string[])].slice(
    0,
    10,
  );
  const organizations = [
    ...new Set(doc.organizations().out("array") as string[]),
  ].slice(0, 10);
  const places = [...new Set(doc.places().out("array") as string[])].slice(
    0,
    10,
  );
  const topics = [...new Set(doc.topics().out("array") as string[])].slice(
    0,
    15,
  );

  return { people, organizations, places, topics };
}

export function computeFleschReadingEase(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  if (words.length === 0 || sentences.length === 0) return 0;

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / words.length;

  return 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
}

export function countComplexWords(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return words.filter((w) => countSyllables(w) >= 4).length;
}

export function countPatternMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

export function countTransitionWords(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  return words.filter((w) => lower.includes(w)).length;
}

export function avgSentenceLength(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  if (sentences.length === 0) return 0;
  return Math.round(words.length / sentences.length);
}

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

export function evaluateFreshness($: CheerioAPI): FreshnessResultType {
  let modifiedDate: string | null = null;
  let publishDate: string | null = null;

  for (const sel of MODIFIED_DATE_SELECTORS) {
    const el = $(sel).first();
    if (el.length) {
      modifiedDate =
        el.attr("datetime") || el.attr("content") || el.text().trim();
      break;
    }
  }

  for (const sel of PUBLISH_DATE_SELECTORS) {
    const el = $(sel).first();
    if (el.length) {
      publishDate =
        el.attr("datetime") || el.attr("content") || el.text().trim();
      break;
    }
  }

  const mostRecent = modifiedDate || publishDate;
  let ageInMonths: number | null = null;

  if (mostRecent) {
    const parsed = new Date(mostRecent);
    if (!isNaN(parsed.getTime())) {
      const now = new Date();
      ageInMonths =
        (now.getFullYear() - parsed.getFullYear()) * 12 +
        (now.getMonth() - parsed.getMonth());
    }
  }

  return {
    publishDate,
    modifiedDate,
    ageInMonths,
    hasModifiedDate: !!modifiedDate,
  };
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

export function checkCrawlerAccess(
  robotsTxt: string | null,
): CrawlerAccessResultType {
  if (!robotsTxt)
    return { allowed: [], blocked: [], unknown: [...AI_CRAWLERS] };

  const lines = robotsTxt.split("\n").map((l) => l.trim());
  const allowed: string[] = [];
  const blocked: string[] = [];
  const unknown: string[] = [];

  for (const crawler of AI_CRAWLERS) {
    const crawlerLower = crawler.toLowerCase();
    let currentAgent = "";
    let isBlocked = false;
    let found = false;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith("user-agent:")) {
        currentAgent = lower.split(":")[1]?.trim() || "";
      } else if (currentAgent === crawlerLower || currentAgent === "*") {
        if (lower.startsWith("disallow:")) {
          const path = lower.split(":")[1]?.trim();
          if (path === "/") {
            if (currentAgent === crawlerLower) {
              isBlocked = true;
              found = true;
            } else if (currentAgent === "*" && !found) {
              isBlocked = true;
            }
          }
        } else if (lower.startsWith("allow:")) {
          if (currentAgent === crawlerLower) {
            found = true;
            isBlocked = false;
          }
        }
      }
    }

    if (found) {
      if (isBlocked) blocked.push(crawler);
      else allowed.push(crawler);
    } else if (isBlocked) {
      blocked.push(crawler); // blocked by wildcard
    } else {
      unknown.push(crawler); // not mentioned = allowed by default
    }
  }

  return { allowed, blocked, unknown };
}

const SCHEMA_REQUIRED_PROPERTIES: Record<string, string[]> = {
  Article: ["headline", "author", "datePublished"],
  NewsArticle: ["headline", "author", "datePublished"],
  BlogPosting: ["headline", "author", "datePublished"],
  FAQPage: ["mainEntity"],
  HowTo: ["name", "step"],
  Organization: ["name", "url"],
  LocalBusiness: ["name", "address"],
  Product: ["name"],
  WebPage: ["name"],
};

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

export function evaluateSchemaCompleteness(
  schemas: Record<string, unknown>[],
): {
  totalTypes: number;
  avgCompleteness: number;
  details: Array<{ type: string; present: string[]; missing: string[] }>;
} {
  const details: Array<{
    type: string;
    present: string[];
    missing: string[];
  }> = [];

  for (const schema of schemas) {
    const type = String(schema["@type"] || "");
    const requiredProps = SCHEMA_REQUIRED_PROPERTIES[type];
    if (!requiredProps) continue;

    const present = requiredProps.filter((prop) => schema[prop] != null);
    const missing = requiredProps.filter((prop) => schema[prop] == null);
    details.push({ type, present, missing });
  }

  const avgCompleteness =
    details.length > 0
      ? details.reduce(
          (sum, d) =>
            sum + d.present.length / (d.present.length + d.missing.length),
          0,
        ) / details.length
      : 0;

  return { totalTypes: details.length, avgCompleteness, details };
}

export function resolveEntityName($: CheerioAPI, html: string): string | null {
  const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim();
  if (ogSiteName) return ogSiteName;

  const jsonLdScripts = $('script[type="application/ld+json"]');
  let orgName: string | null = null;
  jsonLdScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      if (data["@type"] === "Organization" && data.name) {
        orgName = String(data.name).trim();
      }
      if (data.publisher?.name) {
        orgName = orgName || String(data.publisher.name).trim();
      }
    } catch {}
  });

  return orgName || null;
}

export function measureEntityConsistency(
  $: CheerioAPI,
  pageTitle: string,
  entityName: string | null,
): { score: number; surfacesFound: number; surfacesChecked: number } {
  if (!entityName) return { score: 0, surfacesFound: 0, surfacesChecked: 0 };

  const nameLower = entityName.toLowerCase();
  const surfacesChecked = 4;
  let surfacesFound = 0;

  if (pageTitle.toLowerCase().includes(nameLower)) surfacesFound++;

  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  if (ogTitle.toLowerCase().includes(nameLower)) surfacesFound++;

  const footerText = $("footer").text().toLowerCase();
  if (footerText.includes(nameLower)) surfacesFound++;

  const copyrightText = $('[class*="copyright"], [class*="legal"]')
    .text()
    .toLowerCase();
  const headerText = $("header").text().toLowerCase();
  if (copyrightText.includes(nameLower) || headerText.includes(nameLower))
    surfacesFound++;

  const score =
    surfacesFound >= 4
      ? 10
      : surfacesFound >= 3
        ? 7
        : surfacesFound >= 2
          ? 4
          : surfacesFound >= 1
            ? 2
            : 0;

  return { score, surfacesFound, surfacesChecked };
}
