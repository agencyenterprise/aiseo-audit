import { countWords, escapeRegExp } from "../../utils/strings.js";
import { buildCategoryOutput } from "../audits/category.js";
import type { ExtractedPageType } from "../extractor/schema.js";
import { extractEntities } from "../nlp/service.js";
import { extractSalientTerms } from "../nlp/support/salience.js";
import {
  makeDiagnostic,
  makeFactor,
  thresholdScore,
} from "../scoring/service.js";
import type {
  CategoryAuditOutputType,
  ExtractedEntitiesType,
  FactorResultType,
} from "../audits/schema.js";
import { measurePronounAmbiguity } from "./pronouns.js";

export function auditEntityClarity(
  page: ExtractedPageType,
  preExtracted?: ExtractedEntitiesType,
): CategoryAuditOutputType {
  const text = page.cleanText;
  const factors: FactorResultType[] = [];

  const entities = preExtracted ?? extractEntities(text);
  const namedEntityCount = countNamedEntities(entities);

  const richScore = thresholdScore(namedEntityCount, [
    [9, 12],
    [4, 8],
    [1, 4],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Entity Richness",
      richScore,
      12,
      `${namedEntityCount} entities (${entities.people.length} people, ${entities.organizations.length} orgs, ${entities.places.length} places)`,
      namedEntityCount === 0 ? "neutral" : undefined,
    ),
  );

  const titleWords = page.title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const h1Text = page.$("h1").first().text().toLowerCase();
  const h1Words = h1Text.split(/\s+/).filter((w) => w.length > 3);
  const keyWords = [...new Set([...titleWords, ...h1Words])];
  const topicLower = entities.topics.map((t) => t.toLowerCase());
  const lowerText = text.toLowerCase();

  let topicOverlap = 0;
  for (const keyword of keyWords) {
    if (
      topicLower.some((topic) => topic.includes(keyword)) ||
      countWholeWordOccurrences(lowerText, keyword) >= 3
    ) {
      topicOverlap++;
    }
  }

  const consistencyRatio =
    keyWords.length > 0 ? topicOverlap / keyWords.length : 0;
  const consistencyScore =
    keyWords.length === 0
      ? 0
      : thresholdScore(consistencyRatio, [
          [0.5, 18],
          [0.01, 11],
        ]);
  factors.push(
    makeFactor(
      "Topic Consistency",
      consistencyScore,
      18,
      `${topicOverlap}/${keyWords.length} title keywords align with content topics`,
      keyWords.length === 0 ? "neutral" : undefined,
    ),
  );

  factors.push(termRepetitionBalanceFactor(text, entities));

  const pronounAmbiguity = measurePronounAmbiguity(page.$);
  factors.push(
    makeDiagnostic(
      "Pronoun Ambiguity",
      pronounAmbiguity.paragraphsChecked > 0
        ? `${pronounAmbiguity.paragraphsOpeningWithPronoun} of ${pronounAmbiguity.paragraphsChecked} substantial paragraphs open with a pronoun subject`
        : "No substantial paragraphs found",
    ),
  );

  return buildCategoryOutput("entityClarity", factors, {
    entities: {
      ...entities,
      people: entities.people.slice(0, 20),
      organizations: entities.organizations.slice(0, 20),
      places: entities.places.slice(0, 20),
    },
  });
}

const BALANCED_REPETITION_MAX_SHARE = 0.025;
const OVER_OPTIMIZED_REPETITION_SHARE = 0.04;

function termRepetitionBalanceFactor(
  text: string,
  entities: ExtractedEntitiesType,
): FactorResultType {
  const wordCount = countWords(text);
  const salient = extractSalientTerms(text, entities);
  const leadingTerm = [...salient.entities, ...salient.terms][0];

  if (!leadingTerm || wordCount === 0) {
    return makeFactor(
      "Term Repetition Balance",
      0,
      8,
      "No salient terms to measure",
      "neutral",
    );
  }

  const termWordCount = leadingTerm.split(/\s+/).length;
  const occurrences = countWholeWordOccurrences(
    text.toLowerCase(),
    leadingTerm.toLowerCase(),
  );
  const share = (occurrences * termWordCount) / wordCount;
  const sharePct = `${(share * 100).toFixed(1)}%`;

  if (share <= BALANCED_REPETITION_MAX_SHARE) {
    return makeFactor(
      "Term Repetition Balance",
      8,
      8,
      `"${leadingTerm}" fills ${sharePct} of the text`,
    );
  }
  if (share <= OVER_OPTIMIZED_REPETITION_SHARE) {
    return makeFactor(
      "Term Repetition Balance",
      4,
      8,
      `"${leadingTerm}" fills ${sharePct} of the text, approaching over-optimization`,
    );
  }
  return makeFactor(
    "Term Repetition Balance",
    0,
    8,
    `"${leadingTerm}" fills ${sharePct} of the text, an over-optimization risk that measurably reduced visibility`,
  );
}

function countNamedEntities(entities: ExtractedEntitiesType): number {
  return (
    entities.people.length +
    entities.organizations.length +
    entities.places.length
  );
}

function countWholeWordOccurrences(text: string, word: string): number {
  return (
    text.match(new RegExp(`\\b${escapeRegExp(word)}\\b`, "g"))?.length ?? 0
  );
}
