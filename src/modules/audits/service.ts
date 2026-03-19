import type { ExtractedPageType } from "../extractor/schema.js";
import type { FetchResultType } from "../fetcher/schema.js";
import { extractEntities } from "../nlp/service.js";
import { auditAnswerability } from "../answerability/index.js";
import { auditAuthorityContext } from "../authority-context/index.js";
import { auditContentExtractability } from "../content-extractability/index.js";
import { auditContentStructure } from "../content-structure/index.js";
import { auditEntityClarity } from "../entity-clarity/index.js";
import { auditGroundingSignals } from "../grounding-signals/index.js";
import { auditReadabilityForCompression } from "../readability/index.js";
import type { AuditResultType, DomainSignalsType } from "./schema.js";

export function runAudits(
  page: ExtractedPageType,
  fetchResult: FetchResultType,
  domainSignals?: DomainSignalsType,
): AuditResultType {
  const entities = extractEntities(page.cleanText);

  const extractability = auditContentExtractability(
    page,
    fetchResult,
    domainSignals,
  );
  const structure = auditContentStructure(page);
  const answerability = auditAnswerability(page, entities);
  const entityClarity = auditEntityClarity(page, entities);
  const groundingSignals = auditGroundingSignals(page, entities);
  const authorityContext = auditAuthorityContext(page);
  const readability = auditReadabilityForCompression(page);

  return {
    categories: {
      contentExtractability: extractability.category,
      contentStructure: structure.category,
      answerability: answerability.category,
      entityClarity: entityClarity.category,
      groundingSignals: groundingSignals.category,
      authorityContext: authorityContext.category,
      readabilityForCompression: readability.category,
    },
    rawData: {
      title: page.title,
      metaDescription: page.metaDescription,
      wordCount: page.stats.wordCount,
      ...extractability.rawData,
      ...structure.rawData,
      ...answerability.rawData,
      ...entityClarity.rawData,
      ...groundingSignals.rawData,
      ...authorityContext.rawData,
      ...readability.rawData,
    },
  };
}
