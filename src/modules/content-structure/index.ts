import type { ExtractedPageType } from "../extractor/schema.js";
import { buildCategoryOutput } from "../audits/category.js";
import { makeFactor, thresholdScore } from "../scoring/service.js";
import type {
  CategoryAuditOutputType,
  FactorResultType,
} from "../audits/schema.js";
import { measureSectionLengths } from "./sections.js";

export function auditContentStructure(
  page: ExtractedPageType,
): CategoryAuditOutputType {
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
  const tableScore = thresholdScore(tables, [
    [2, 8],
    [1, 5],
  ]);
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
  const paragraphScore = thresholdScore(
    avgParagraphWords,
    [
      [30, 151, 11],
      [1, 200, 7],
      [200, Infinity, 2],
    ],
    "range",
  );
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
  if (hasFrequentVisualBreaks(page.stats)) scanScore += 4;
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
  const sectionScore =
    sectionData.sectionCount === 0
      ? 0
      : thresholdScore(
          sectionData.avgWordsPerSection,
          [
            [120, 181, 12],
            [80, 251, 8],
            [1, Infinity, 4],
          ],
          "range",
        );
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

  return buildCategoryOutput("contentStructure", factors, {
    sectionLengths: sectionData,
  });
}

const MAX_WORDS_PER_VISUAL_BREAK = 150;

function hasFrequentVisualBreaks(stats: ExtractedPageType["stats"]): boolean {
  const visualBreaks =
    stats.headingCount + stats.listCount + stats.tableCount + stats.imageCount;
  if (visualBreaks === 0) return false;
  return stats.wordCount / visualBreaks <= MAX_WORDS_PER_VISUAL_BREAK;
}
