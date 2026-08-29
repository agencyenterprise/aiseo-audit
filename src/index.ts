export { analyzeUrl } from "./modules/analyzer/service.js";
export { loadConfig, loadConfigWithPath } from "./modules/config/service.js";
export { loadBaselineResult } from "./modules/diff/history.js";
export { orchestrateDiff } from "./modules/diff/orchestrate.js";
export type {
  OrchestrateDiffInputs,
  OrchestrateDiffOutcome,
} from "./modules/diff/orchestrate.js";
export { computeDiff } from "./modules/diff/service.js";
export {
  renderDiffReport,
  renderHistoryTimeline,
  renderReport,
  renderSitemapReport,
} from "./modules/report/service.js";
export { makeDiagnostic } from "./modules/scoring/service.js";
export { computeStages } from "./modules/scoring/stages.js";
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
  EvidenceTierType,
  FactorResultType,
} from "./modules/audits/schema.js";
export type { StageNameType } from "./modules/audits/stage.js";
export type {
  AiseoConfigType,
  CategoryWeightType,
  DiffEntryType,
  DomainOptionType,
  EngineProfileType,
  StageWeightType,
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
export type {
  GateResultType,
  GradeType,
  ScoreSummaryType,
  StageScoresType,
  StageScoreType,
} from "./modules/scoring/schema.js";
export type {
  SitemapOptionsType,
  SitemapResultType,
  SitemapUrlResultType,
} from "./modules/sitemap/schema.js";
export { FetchError } from "./utils/http.js";
export type { FetchErrorCode } from "./utils/http.js";
