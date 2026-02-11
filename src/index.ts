// Library entrypoint - programmatic API
export { analyzeUrl } from './modules/analyzer/service.js';
export { loadConfig } from './modules/config/service.js';
export { renderReport } from './modules/report/service.js';

// Types
export type { AnalyzerOptions, AnalyzerResult } from './modules/analyzer/schema.js';
export type { GeoJsonConfig, CategoryWeight } from './modules/config/schema.js';
export type { AuditResult, CategoryResult, FactorResult, CategoryName } from './modules/audits/schema.js';
export type { DomainSignals } from './modules/audits/service.js';
export type { ScoreSummary, Grade } from './modules/scoring/schema.js';
export type { Recommendation } from './modules/recommendations/schema.js';
export type { ReportFormat, RenderOptions } from './modules/report/schema.js';
export type { FetchResult } from './modules/fetcher/schema.js';
export type { ExtractedPage, PageStats } from './modules/extractor/schema.js';
