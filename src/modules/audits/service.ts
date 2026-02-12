import type { ExtractedPageType } from "../extractor/schema.js";
import type { FetchResultType } from "../fetcher/schema.js";
import { auditAnswerability } from "./categories/answerability.js";
import { auditAuthorityContext } from "./categories/authority-context.js";
import { auditContentExtractability } from "./categories/content-extractability.js";
import { auditContentStructure } from "./categories/content-structure.js";
import { auditEntityClarity } from "./categories/entity-clarity.js";
import { auditGroundingSignals } from "./categories/grounding-signals.js";
import { auditReadabilityForCompression } from "./categories/readability.js";
import type { AuditResultType, DomainSignalsType } from "./schema.js";

export function runAudits(
  page: ExtractedPageType,
  fetchResult: FetchResultType,
  domainSignals?: DomainSignalsType,
): AuditResultType {
  const extractability = auditContentExtractability(
    page,
    fetchResult,
    domainSignals,
  );
  const structure = auditContentStructure(page);
  const answerability = auditAnswerability(page);
  const entityClarity = auditEntityClarity(page);
  const groundingSignals = auditGroundingSignals(page);
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
