import type { ExtractedPageType } from "../extractor/schema.js";
import { buildCategoryOutput } from "../audits/category.js";
import { makeDiagnostic, makeFactor } from "../scoring/service.js";
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

  factors.push(
    makeDiagnostic("Lists Presence", `${page.stats.listItemCount} list items`),
  );

  factors.push(
    makeDiagnostic("Tables Presence", `${page.stats.tableCount} table(s)`),
  );

  const pCount = page.stats.paragraphCount;
  const avgParagraphWords =
    pCount > 0 ? Math.round(page.stats.wordCount / pCount) : 0;
  factors.push(
    makeDiagnostic(
      "Paragraph Structure",
      `${pCount} paragraphs, avg ${avgParagraphWords} words`,
    ),
  );

  const hasBold = $("strong, b").length > 0;
  const headingRatio = pCount > 0 ? page.stats.headingCount / pCount : 0;
  factors.push(
    makeDiagnostic(
      "Scannability",
      `${hasBold ? "Bold text found" : "No bold text"}, ${headingRatio.toFixed(2)} heading ratio`,
    ),
  );

  const sectionData = measureSectionLengths(page.$);
  factors.push(
    makeDiagnostic(
      "Section Length",
      sectionData.sectionCount > 0
        ? `${sectionData.sectionCount} sections, avg ${sectionData.avgWordsPerSection} words`
        : "No headed sections found",
    ),
  );

  return buildCategoryOutput("contentStructure", factors, {
    sectionLengths: sectionData,
  });
}
