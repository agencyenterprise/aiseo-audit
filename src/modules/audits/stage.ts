import { z } from "zod";
import type { FactorNameType } from "./factor-names.js";
import type { AuditRawDataType, EvidenceTierType } from "./schema.js";

export const StageNameSchema = z.enum([
  "technicalEligibility",
  "retrievalAlignment",
  "citationFitness",
  "provenance",
]);

export type StageNameType = z.infer<typeof StageNameSchema>;

export type FactorMetaType = {
  stage: StageNameType;
  evidence: EvidenceTierType;
  citations: string[];
  blocking?: boolean;
};

export const DEFAULT_EVIDENCE_TIER: EvidenceTierType = "heuristic";

export const FACTOR_REGISTRY: Record<FactorNameType, FactorMetaType> = {
  "Fetch Success": {
    stage: "technicalEligibility",
    evidence: "supported",
    citations: [],
    blocking: true,
  },
  "Text Extraction Quality": {
    stage: "technicalEligibility",
    evidence: "supported",
    citations: [],
    blocking: true,
  },
  "Boilerplate Ratio": {
    stage: "technicalEligibility",
    evidence: "conditional",
    citations: ["autogeo-iclr-2026"],
  },
  "Word Count Adequacy": {
    stage: "citationFitness",
    evidence: "diagnostic",
    citations: ["sageo-arena-kdd-2026"],
  },
  "AI Crawler Access": {
    stage: "technicalEligibility",
    evidence: "supported",
    citations: ["characterizing-web-search-findings-acl-2026"],
  },
  "LLMs.txt Presence": {
    stage: "technicalEligibility",
    evidence: "experimental",
    citations: ["c-seo-bench-neurips-2025"],
  },
  "Image Accessibility": {
    stage: "technicalEligibility",
    evidence: "diagnostic",
    citations: [],
  },
  "Heading Hierarchy": {
    stage: "retrievalAlignment",
    evidence: "heuristic",
    citations: ["sageo-arena-kdd-2026"],
  },
  "Lists Presence": {
    stage: "citationFitness",
    evidence: "diagnostic",
    citations: ["what-gets-cited-sigir-2026"],
  },
  "Tables Presence": {
    stage: "citationFitness",
    evidence: "diagnostic",
    citations: ["what-gets-cited-sigir-2026"],
  },
  "Paragraph Structure": {
    stage: "citationFitness",
    evidence: "diagnostic",
    citations: ["what-gets-cited-sigir-2026"],
  },
  Scannability: {
    stage: "citationFitness",
    evidence: "diagnostic",
    citations: ["what-gets-cited-sigir-2026"],
  },
  "Section Length": {
    stage: "citationFitness",
    evidence: "diagnostic",
    citations: ["what-gets-cited-sigir-2026"],
  },
  "Definition Patterns": {
    stage: "citationFitness",
    evidence: "heuristic",
    citations: [],
  },
  "Direct Answer Statements": {
    stage: "citationFitness",
    evidence: "conditional",
    citations: [
      "c-seo-bench-neurips-2025",
      "autogeo-iclr-2026",
      "sageo-arena-kdd-2026",
    ],
  },
  "Answer Capsules": {
    stage: "citationFitness",
    evidence: "diagnostic",
    citations: ["what-gets-cited-sigir-2026", "mind-reader-acl-2026"],
  },
  "Step-by-Step Content": {
    stage: "citationFitness",
    evidence: "heuristic",
    citations: ["autogeo-iclr-2026"],
  },
  "Q/A Patterns": {
    stage: "citationFitness",
    evidence: "diagnostic",
    citations: ["mind-reader-acl-2026"],
  },
  "Summary/Conclusion": {
    stage: "citationFitness",
    evidence: "heuristic",
    citations: ["autogeo-iclr-2026"],
  },
  "Entity Richness": {
    stage: "retrievalAlignment",
    evidence: "heuristic",
    citations: ["sageo-arena-kdd-2026"],
  },
  "Topic Consistency": {
    stage: "retrievalAlignment",
    evidence: "conditional",
    citations: ["autogeo-iclr-2026", "sageo-arena-kdd-2026"],
  },
  "Term Repetition Balance": {
    stage: "retrievalAlignment",
    evidence: "conditional",
    citations: [
      "autogeo-iclr-2026",
      "mind-reader-acl-2026",
      "featgeo-acl-2026",
      "sageo-arena-kdd-2026",
    ],
  },
  "Pronoun Ambiguity": {
    stage: "citationFitness",
    evidence: "diagnostic",
    citations: ["sageo-arena-kdd-2026"],
  },
  "External References": {
    stage: "citationFitness",
    evidence: "heuristic",
    citations: ["autogeo-iclr-2026"],
  },
  "Citation Patterns": {
    stage: "citationFitness",
    evidence: "conditional",
    citations: ["what-gets-cited-sigir-2026", "c-seo-bench-neurips-2025"],
  },
  "Numeric Claims": {
    stage: "citationFitness",
    evidence: "conditional",
    citations: ["what-gets-cited-sigir-2026", "c-seo-bench-neurips-2025"],
  },
  "Attribution Indicators": {
    stage: "citationFitness",
    evidence: "conditional",
    citations: ["what-gets-cited-sigir-2026"],
  },
  "Quoted Attribution": {
    stage: "citationFitness",
    evidence: "heuristic",
    citations: ["c-seo-bench-neurips-2025"],
  },
  "Author Attribution": {
    stage: "provenance",
    evidence: "heuristic",
    citations: ["authority-aware-genir-acl-2026"],
  },
  "Organization Identity": {
    stage: "provenance",
    evidence: "heuristic",
    citations: ["authority-aware-genir-acl-2026"],
  },
  "Contact/About Links": {
    stage: "provenance",
    evidence: "heuristic",
    citations: ["authority-aware-genir-acl-2026"],
  },
  "Date Markup": {
    stage: "provenance",
    evidence: "diagnostic",
    citations: ["what-gets-cited-sigir-2026"],
  },
  "Topic Time Sensitivity": {
    stage: "provenance",
    evidence: "diagnostic",
    citations: [
      "what-gets-cited-sigir-2026",
      "characterizing-web-search-findings-acl-2026",
    ],
  },
  "Promotional Language": {
    stage: "provenance",
    evidence: "diagnostic",
    citations: ["authority-aware-genir-acl-2026", "autogeo-iclr-2026"],
  },
  "Affiliate Link Density": {
    stage: "provenance",
    evidence: "diagnostic",
    citations: ["authority-aware-genir-acl-2026"],
  },
  "Ad Slot Markers": {
    stage: "provenance",
    evidence: "diagnostic",
    citations: ["authority-aware-genir-acl-2026"],
  },
  "Site Type": {
    stage: "provenance",
    evidence: "diagnostic",
    citations: ["characterizing-web-search-findings-acl-2026"],
  },
  "Content Freshness": {
    stage: "citationFitness",
    evidence: "conditional",
    citations: [
      "what-gets-cited-sigir-2026",
      "characterizing-web-search-findings-acl-2026",
    ],
  },
  "Structured Data": {
    stage: "retrievalAlignment",
    evidence: "conditional",
    citations: ["sageo-arena-kdd-2026"],
  },
  "Schema Completeness": {
    stage: "retrievalAlignment",
    evidence: "heuristic",
    citations: ["sageo-arena-kdd-2026"],
  },
  "Entity Consistency": {
    stage: "retrievalAlignment",
    evidence: "conditional",
    citations: ["sageo-arena-kdd-2026", "authority-aware-genir-acl-2026"],
  },
  "Sentence Length": {
    stage: "citationFitness",
    evidence: "heuristic",
    citations: ["featgeo-acl-2026"],
  },
  Readability: {
    stage: "citationFitness",
    evidence: "heuristic",
    citations: ["featgeo-acl-2026", "mind-reader-acl-2026"],
  },
  "Jargon Density": {
    stage: "retrievalAlignment",
    evidence: "conditional",
    citations: ["sageo-arena-kdd-2026"],
  },
  "Transition Usage": {
    stage: "citationFitness",
    evidence: "diagnostic",
    citations: ["what-gets-cited-sigir-2026"],
  },
  "Paywall Signals": {
    stage: "technicalEligibility",
    evidence: "heuristic",
    citations: ["autogeo-iclr-2026"],
  },
  "Title Entity Alignment": {
    stage: "retrievalAlignment",
    evidence: "conditional",
    citations: ["sageo-arena-kdd-2026"],
  },
  "Meta Description Alignment": {
    stage: "retrievalAlignment",
    evidence: "conditional",
    citations: ["sageo-arena-kdd-2026"],
  },
  "Heading Entity Alignment": {
    stage: "retrievalAlignment",
    evidence: "conditional",
    citations: ["sageo-arena-kdd-2026"],
  },
  "Structured Data Alignment": {
    stage: "retrievalAlignment",
    evidence: "conditional",
    citations: ["sageo-arena-kdd-2026"],
  },
  "Lead Summary": {
    stage: "citationFitness",
    evidence: "conditional",
    citations: [
      "c-seo-bench-neurips-2025",
      "autogeo-iclr-2026",
      "sageo-arena-kdd-2026",
    ],
  },
  "Explanatory Depth": {
    stage: "citationFitness",
    evidence: "heuristic",
    citations: ["autogeo-iclr-2026"],
  },
  "Query Term Coverage (Structural)": {
    stage: "retrievalAlignment",
    evidence: "supported",
    citations: ["what-gets-cited-sigir-2026", "sageo-arena-kdd-2026"],
  },
  "Query Term Coverage (Body)": {
    stage: "citationFitness",
    evidence: "supported",
    citations: ["what-gets-cited-sigir-2026"],
  },
  "Query Aspect Coverage": {
    stage: "citationFitness",
    evidence: "heuristic",
    citations: ["mind-reader-acl-2026"],
  },
  "Hedged Language": {
    stage: "citationFitness",
    evidence: "conditional",
    citations: ["what-gets-cited-sigir-2026"],
  },
  "Price Presence": {
    stage: "citationFitness",
    evidence: "supported",
    citations: ["what-gets-cited-sigir-2026"],
  },
  "Technical Specifications": {
    stage: "citationFitness",
    evidence: "conditional",
    citations: ["what-gets-cited-sigir-2026"],
  },
  "Comparison Content": {
    stage: "citationFitness",
    evidence: "conditional",
    citations: ["what-gets-cited-sigir-2026"],
  },
};

export type ResolvedDomainType = "product" | "informational";

export type GateContextType = {
  rawData: Partial<AuditRawDataType>;
  queries: string[];
  domain: ResolvedDomainType;
};

export type GateSpecType = {
  id: "staleVisibleDate" | "offTopicForQueries" | "missingPriceProduct";
  label: string;
  capPct: number;
  citations: string[];
  appliesWhen(context: GateContextType): boolean;
  isTripped(context: GateContextType): boolean;
};

const VISIBLY_STALE_AGE_IN_MONTHS = 24;
const OFF_TOPIC_COVERAGE_FLOOR = 0.2;

export const CITATION_GATES: GateSpecType[] = [
  {
    id: "staleVisibleDate",
    label: "Visible date is stale",
    capPct: 50,
    citations: ["what-gets-cited-sigir-2026"],
    appliesWhen: ({ rawData, domain }) =>
      domain !== "informational" && rawData.freshness?.ageInMonths != null,
    isTripped: ({ rawData }) =>
      (rawData.freshness?.ageInMonths ?? 0) > VISIBLY_STALE_AGE_IN_MONTHS,
  },
  {
    id: "offTopicForQueries",
    label: "Content is off-topic for every target query",
    capPct: 50,
    citations: ["what-gets-cited-sigir-2026"],
    appliesWhen: ({ queries, rawData }) =>
      queries.length > 0 && rawData.queryAlignment != null,
    isTripped: ({ rawData }) =>
      (rawData.queryAlignment?.queries ?? []).every(
        (query) =>
          Math.max(query.structuralCoverage, query.bodyCoverage) <
          OFF_TOPIC_COVERAGE_FLOOR,
      ),
  },
  {
    id: "missingPriceProduct",
    label: "Product page without price information",
    capPct: 60,
    citations: ["what-gets-cited-sigir-2026"],
    appliesWhen: ({ domain, rawData }) =>
      domain === "product" && rawData.priceSignals != null,
    isTripped: ({ rawData }) => rawData.priceSignals?.found === false,
  },
];

const PRODUCT_SCHEMA_TYPES = new Set(["Product", "Offer", "AggregateOffer"]);

export function resolveDomain(
  requested: "auto" | ResolvedDomainType,
  rawData: Partial<AuditRawDataType>,
): ResolvedDomainType {
  if (requested !== "auto") return requested;
  if (rawData.domainDetected) return rawData.domainDetected;
  const pageDeclaresProductSchema = (rawData.structuredDataTypes ?? []).some(
    (type) => PRODUCT_SCHEMA_TYPES.has(type),
  );
  return pageDeclaresProductSchema ? "product" : "informational";
}
