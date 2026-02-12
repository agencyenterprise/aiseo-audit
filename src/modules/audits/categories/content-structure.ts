import type { ExtractedPageType } from "../../extractor/schema.js";
import { CATEGORY_DISPLAY_NAMES } from "../constants.js";
import type { CategoryAuditOutput, FactorResultType } from "../schema.js";
import { measureSectionLengths } from "../support/dom.js";
import {
  makeFactor,
  maxFactors,
  sumFactors,
  thresholdScore,
} from "../support/scoring.js";

export function auditContentStructure(
  page: ExtractedPageType,
): CategoryAuditOutput {
  const $ = page.$;
  const factors: FactorResultType[] = [];

  const h1 = page.stats.h1Count;
  const h2 = page.stats.h2Count;
  const h3 = page.stats.h3Count;
  let headingScore = 0;
  if (h1 === 1) headingScore += 4;
  else if (h1 > 0) headingScore += 2;
  if (h2 >= 2) headingScore += 4;
  else if (h2 > 0) headingScore += 2;
  if (h3 > 0) headingScore += 3;
  factors.push(
    makeFactor(
      "Heading Hierarchy",
      headingScore,
      11,
      `${h1} H1, ${h2} H2, ${h3} H3`,
    ),
  );

  const listItems = page.stats.listItemCount;
  const listScore = thresholdScore(listItems, [
    [10, 11],
    [5, 8],
    [1, 4],
    [0, 0],
  ]);
  factors.push(
    makeFactor("Lists Presence", listScore, 11, `${listItems} list items`),
  );

  const tables = page.stats.tableCount;
  const tableScore = tables >= 2 ? 8 : tables >= 1 ? 5 : 0;
  factors.push(
    makeFactor(
      "Tables Presence",
      tableScore,
      8,
      `${tables} table(s)`,
      tables === 0 ? "neutral" : undefined,
    ),
  );

  const pCount = page.stats.paragraphCount;
  const avgParagraphWords =
    pCount > 0 ? Math.round(page.stats.wordCount / pCount) : 0;
  const paragraphScore =
    avgParagraphWords >= 30 && avgParagraphWords <= 150
      ? 11
      : avgParagraphWords > 0 && avgParagraphWords < 200
        ? 7
        : 2;
  factors.push(
    makeFactor(
      "Paragraph Structure",
      paragraphScore,
      11,
      `${pCount} paragraphs, avg ${avgParagraphWords} words`,
    ),
  );

  const hasBold = $("strong, b").length > 0;
  const headingRatio = pCount > 0 ? page.stats.headingCount / pCount : 0;
  let scanScore = 0;
  if (hasBold) scanScore += 4;
  if (avgParagraphWords <= 150) scanScore += 4;
  if (headingRatio >= 0.1) scanScore += 3;
  factors.push(
    makeFactor(
      "Scannability",
      scanScore,
      11,
      `${hasBold ? "Bold text found" : "No bold text"}, ${headingRatio.toFixed(2)} heading ratio`,
    ),
  );

  const sectionData = measureSectionLengths(page.$);
  let sectionScore = 0;
  if (sectionData.sectionCount === 0) {
    sectionScore = 0;
  } else if (
    sectionData.avgWordsPerSection >= 120 &&
    sectionData.avgWordsPerSection <= 180
  ) {
    sectionScore = 12;
  } else if (
    sectionData.avgWordsPerSection >= 80 &&
    sectionData.avgWordsPerSection <= 250
  ) {
    sectionScore = 8;
  } else if (sectionData.avgWordsPerSection > 0) {
    sectionScore = 4;
  }
  factors.push(
    makeFactor(
      "Section Length",
      sectionScore,
      12,
      sectionData.sectionCount > 0
        ? `${sectionData.sectionCount} sections, avg ${sectionData.avgWordsPerSection} words`
        : "No headed sections found",
      sectionData.sectionCount === 0 ? "neutral" : undefined,
    ),
  );

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.contentStructure,
      key: "contentStructure",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData: {
      sectionLengths: sectionData,
    },
  };
}
