import { buildCategoryOutput } from "../audits/category.js";
import type {
  CategoryAuditOutputType,
  FactorResultType,
} from "../audits/schema.js";
import type { ExtractedPageType } from "../extractor/schema.js";
import { parseJsonLdObjects } from "../extractor/json-ld.js";
import { makeFactor, thresholdScore } from "../scoring/service.js";
import { measureAspectCoverage } from "./aspects.js";
import { measureQueryCoverage, type QueryCoverageType } from "./coverage.js";

export function auditQueryAlignment(
  page: ExtractedPageType,
  queries: string[],
): CategoryAuditOutputType {
  const structuralText = structuralFieldText(page);
  const perQuery = queries.map((query) =>
    measureQueryCoverage(query, structuralText, page.cleanText),
  );

  const factors: FactorResultType[] = [
    worstCaseCoverageFactor(
      "Query Term Coverage (Structural)",
      15,
      perQuery,
      (coverage) => coverage.structuralCoverage,
      "title, meta description, headings, and JSON-LD",
    ),
    worstCaseCoverageFactor(
      "Query Term Coverage (Body)",
      15,
      perQuery,
      (coverage) => coverage.bodyCoverage,
      "body content",
    ),
    aspectCoverageFactor(page, queries),
  ];

  return buildCategoryOutput("queryAlignment", factors, {
    queryAlignment: { queries: perQuery },
  });
}

function worstCaseCoverageFactor(
  name: "Query Term Coverage (Structural)" | "Query Term Coverage (Body)",
  maxScore: number,
  perQuery: QueryCoverageType[],
  coverageOf: (coverage: QueryCoverageType) => number,
  surfaceLabel: string,
): FactorResultType {
  const worst = perQuery.reduce(
    (lowest, coverage) =>
      coverageOf(coverage) < coverageOf(lowest) ? coverage : lowest,
    perQuery[0],
  );
  const worstShare = coverageOf(worst);
  const servedCount = perQuery.filter(
    (coverage) => coverageOf(coverage) >= 0.6,
  ).length;

  const score = thresholdScore(
    worstShare,
    [
      [0.6, Infinity, maxScore],
      [0.35, 0.6, Math.round(maxScore * 0.6)],
      [0.15, 0.35, Math.round(maxScore * 0.3)],
    ],
    "range",
  );

  return makeFactor(
    name,
    score,
    maxScore,
    `Weakest query "${worst.query}" at ${Math.round(worstShare * 100)}% coverage in ${surfaceLabel}; ${servedCount} of ${perQuery.length} queries adequately served`,
  );
}

const ASPECTS_WELL_COVERED_SHARE = 0.7;
const ASPECTS_PARTLY_COVERED_SHARE = 0.4;

function aspectCoverageFactor(
  page: ExtractedPageType,
  queries: string[],
): FactorResultType {
  const perQueryShares = queries.map((query) => {
    const { aspects, coveredAspects } = measureAspectCoverage(
      query,
      page.$,
      page.cleanText,
    );
    return {
      query,
      share: aspects.length > 0 ? coveredAspects.length / aspects.length : 0,
      covered: coveredAspects.length,
      total: aspects.length,
    };
  });

  const worst = perQueryShares.reduce(
    (lowest, entry) => (entry.share < lowest.share ? entry : lowest),
    perQueryShares[0],
  );

  const score =
    worst.share >= ASPECTS_WELL_COVERED_SHARE
      ? 10
      : worst.share >= ASPECTS_PARTLY_COVERED_SHARE
        ? 6
        : worst.covered > 0
          ? 3
          : 0;

  return makeFactor(
    "Query Aspect Coverage",
    score,
    10,
    `Weakest query "${worst.query}" has ${worst.covered} of ${worst.total} aspects addressed by a dedicated section`,
  );
}

const JSON_LD_TEXT_FIELDS = [
  "headline",
  "description",
  "about",
  "keywords",
  "name",
] as const;

function structuralFieldText(page: ExtractedPageType): string {
  const headings = page
    .$("h1, h2, h3")
    .toArray()
    .map((el) => page.$(el).text())
    .join(" ");
  const jsonLd = parseJsonLdObjects(page.$)
    .flatMap((schema) =>
      JSON_LD_TEXT_FIELDS.map((field) => {
        const value = schema[field];
        return typeof value === "string" ? value : "";
      }),
    )
    .join(" ");

  return [page.title, page.metaDescription, headings, jsonLd].join(" ");
}
