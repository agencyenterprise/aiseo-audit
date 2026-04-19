export { analyzeUrl } from "./modules/analyzer/service.js";
export { loadConfig } from "./modules/config/service.js";
export { computeDiff } from "./modules/diff/service.js";
export {
  renderDiffReport,
  renderHistoryTimeline,
  renderReport,
  renderSitemapReport,
} from "./modules/report/service.js";
export { analyzeSitemap } from "./modules/sitemap/service.js";

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
export type {
  AiseoConfigType,
  CategoryWeightType,
  DiffEntryType,
} from "./modules/config/schema.js";
export type {
  CategoryDeltaType,
  DiffResultType,
} from "./modules/diff/schema.js";
export type {
  ExternalLinkType,
  ExtractedPageType,
  PageStatsType,
} from "./modules/extractor/schema.js";
export type { FetchResultType } from "./modules/fetcher/schema.js";
export type { RecommendationType } from "./modules/recommendations/schema.js";
export type {
  RenderOptionsType,
  ReportFormatType,
} from "./modules/report/schema.js";
export type { GradeType, ScoreSummaryType } from "./modules/scoring/schema.js";
export type {
  SitemapOptionsType,
  SitemapResultType,
  SitemapUrlResultType,
} from "./modules/sitemap/schema.js";
export { FetchError } from "./utils/http.js";
export type { FetchErrorCode } from "./utils/http.js";
