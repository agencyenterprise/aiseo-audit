// Library entrypoint - programmatic API
export { analyzeUrl } from "./modules/analyzer/service.js";
export { loadConfig } from "./modules/config/service.js";
export { renderReport } from "./modules/report/service.js";

// Types
export type {
  AnalyzerOptionsType,
  AnalyzerResultType,
} from "./modules/analyzer/schema.js";
export type {
  AuditResultType,
  CategoryNameType,
  CategoryResultType,
  DomainSignalsType,
  FactorResultType,
} from "./modules/audits/schema.js";
export type { CategoryWeight, GeoJsonConfig } from "./modules/config/schema.js";
export type { ExtractedPage, PageStats } from "./modules/extractor/schema.js";
export type { FetchResult } from "./modules/fetcher/schema.js";
export type { RecommendationType } from "./modules/recommendations/schema.js";
export type { RenderOptions, ReportFormat } from "./modules/report/schema.js";
export type { Grade, ScoreSummary } from "./modules/scoring/schema.js";
