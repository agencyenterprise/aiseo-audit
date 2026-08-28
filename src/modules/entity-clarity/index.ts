import { countWords, escapeRegExp } from "../../utils/strings.js";
import { buildCategoryOutput } from "../audits/category.js";
import type { ExtractedPageType } from "../extractor/schema.js";
import { extractEntities } from "../nlp/service.js";
import { makeFactor, thresholdScore } from "../scoring/service.js";
import type {
  CategoryAuditOutputType,
  ExtractedEntitiesType,
  FactorResultType,
} from "../audits/schema.js";

export function auditEntityClarity(
  page: ExtractedPageType,
  preExtracted?: ExtractedEntitiesType,
): CategoryAuditOutputType {
  const text = page.cleanText;
  const factors: FactorResultType[] = [];

  const entities = preExtracted ?? extractEntities(text);
  const namedEntityCount = countNamedEntities(entities);

  const richScore = thresholdScore(namedEntityCount, [
    [9, 20],
    [4, 14],
    [1, 7],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Entity Richness",
      richScore,
      20,
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
          [0.5, 25],
          [0.01, 15],
        ]);
  factors.push(
    makeFactor(
      "Topic Consistency",
      consistencyScore,
      25,
      `${topicOverlap}/${keyWords.length} title keywords align with content topics`,
      keyWords.length === 0 ? "neutral" : undefined,
    ),
  );

  const wordCount = countWords(text);
  const densityPer100 =
    wordCount > 0 ? (namedEntityCount / wordCount) * 100 : 0;
  const densityScore = thresholdScore(
    densityPer100,
    [
      [2, 8, 15],
      [1, Infinity, 10],
      [0.01, 1, 3],
    ],
    "range",
  );
  factors.push(
    makeFactor(
      "Entity Density",
      densityScore,
      15,
      `${densityPer100.toFixed(1)} entities per 100 words`,
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
