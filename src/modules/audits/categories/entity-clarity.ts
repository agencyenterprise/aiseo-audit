import { countWords } from "../../../utils/strings.js";
import type { ExtractedPageType } from "../../extractor/schema.js";
import { CATEGORY_DISPLAY_NAMES } from "../constants.js";
import type { CategoryAuditOutput, FactorResultType } from "../schema.js";
import { extractEntities } from "../support/nlp.js";
import {
  makeFactor,
  maxFactors,
  sumFactors,
  thresholdScore,
} from "../support/scoring.js";

export function auditEntityClarity(
  page: ExtractedPageType,
): CategoryAuditOutput {
  const text = page.cleanText;
  const factors: FactorResultType[] = [];

  const entities = extractEntities(text);
  const totalEntities =
    entities.people.length +
    entities.organizations.length +
    entities.places.length +
    entities.topics.length;

  const richScore = thresholdScore(totalEntities, [
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
      `${totalEntities} entities (${entities.people.length} people, ${entities.organizations.length} orgs, ${entities.places.length} places)`,
      totalEntities === 0 ? "neutral" : undefined,
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

  let topicOverlap = 0;
  for (const kw of keyWords) {
    if (
      topicLower.some((t) => t.includes(kw)) ||
      text.toLowerCase().split(kw).length > 3
    ) {
      topicOverlap++;
    }
  }

  const consistencyRatio =
    keyWords.length > 0 ? topicOverlap / keyWords.length : 0;
  const consistencyScore =
    consistencyRatio >= 0.5 ? 25 : consistencyRatio > 0 ? 15 : 5;
  factors.push(
    makeFactor(
      "Topic Consistency",
      consistencyScore,
      25,
      `${topicOverlap}/${keyWords.length} title keywords align with content topics`,
    ),
  );

  const wordCount = countWords(text);
  const densityPer100 = wordCount > 0 ? (totalEntities / wordCount) * 100 : 0;
  const densityScore =
    densityPer100 >= 2 && densityPer100 <= 8
      ? 15
      : densityPer100 >= 1
        ? 10
        : densityPer100 > 8
          ? 10
          : 3;
  factors.push(
    makeFactor(
      "Entity Density",
      densityScore,
      15,
      `${densityPer100.toFixed(1)} entities per 100 words`,
    ),
  );

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.entityClarity,
      key: "entityClarity",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData: {
      entities,
    },
  };
}
