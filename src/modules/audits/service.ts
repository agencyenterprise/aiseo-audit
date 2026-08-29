import type { ExtractedPageType } from "../extractor/schema.js";
import type { FetchResultType } from "../fetcher/schema.js";
import { extractEntities } from "../nlp/service.js";
import { auditAnswerability } from "../answerability/index.js";
import { auditAuthorityContext } from "../authority-context/index.js";
import { auditContentExtractability } from "../content-extractability/index.js";
import { auditContentStructure } from "../content-structure/index.js";
import { detectDomain } from "../domain-profile/index.js";
import { auditEntityClarity } from "../entity-clarity/index.js";
import { auditGroundingSignals } from "../grounding-signals/index.js";
import { auditProductFit } from "../product-fit/index.js";
import { auditQueryAlignment } from "../query-alignment/index.js";
import { auditReadabilityForCompression } from "../readability/index.js";
import { auditStructuralAlignment } from "../structural-alignment/index.js";
import type {
  AuditResultType,
  CategoryResultType,
  DomainSignalsType,
} from "./schema.js";

export type RunAuditsOptionsType = {
  queries?: string[];
  domain?: "auto" | "product" | "informational";
};

export function runAudits(
  page: ExtractedPageType,
  fetchResult: FetchResultType,
  domainSignals?: DomainSignalsType,
  options: RunAuditsOptionsType = {},
): AuditResultType {
  const entities = extractEntities(page.cleanText);
  const domain = detectDomain(page, options.domain ?? "auto");
  const queries = options.queries ?? [];

  const extractability = auditContentExtractability(
    page,
    fetchResult,
    domainSignals,
  );
  const structuralAlignment = auditStructuralAlignment(page, entities);
  const structure = auditContentStructure(page);
  const answerability = auditAnswerability(page, entities, { domain });
  const entityClarity = auditEntityClarity(page, entities);
  const groundingSignals = auditGroundingSignals(page, entities);
  const authorityContext = auditAuthorityContext(page);
  const readability = auditReadabilityForCompression(page);

  const conditionalCategories: Partial<
    Record<"queryAlignment" | "productFit", CategoryResultType>
  > = {};
  const conditionalRawData: Record<string, unknown> = {};

  if (queries.length > 0) {
    const queryAlignment = auditQueryAlignment(page, queries);
    conditionalCategories.queryAlignment = queryAlignment.category;
    Object.assign(conditionalRawData, queryAlignment.rawData);
  }

  if (domain === "product") {
    const productFit = auditProductFit(page);
    conditionalCategories.productFit = productFit.category;
    Object.assign(conditionalRawData, productFit.rawData);
  }

  return {
    categories: {
      contentExtractability: extractability.category,
      structuralAlignment: structuralAlignment.category,
      contentStructure: structure.category,
      answerability: answerability.category,
      entityClarity: entityClarity.category,
      groundingSignals: groundingSignals.category,
      authorityContext: authorityContext.category,
      readabilityForCompression: readability.category,
      ...conditionalCategories,
    },
    rawData: {
      title: page.title,
      metaDescription: page.metaDescription,
      wordCount: page.stats.wordCount,
      domainDetected: domain,
      ...extractability.rawData,
      ...structuralAlignment.rawData,
      ...structure.rawData,
      ...answerability.rawData,
      ...entityClarity.rawData,
      ...groundingSignals.rawData,
      ...authorityContext.rawData,
      ...readability.rawData,
      ...conditionalRawData,
    },
  };
}
