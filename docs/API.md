# Programmatic API

`aiseo-audit` provides a typed Node.js API for page and sitemap analysis, report rendering, configuration, and result comparison. It supports ESM and CommonJS and requires Node.js 20.19 or later.

## Install

```bash
npm install aiseo-audit
```

## Analyze and Render a Page

```typescript
import { analyzeUrl, loadConfig, renderReport } from "aiseo-audit";

const config = await loadConfig();
const result = await analyzeUrl({ url: "https://example.com" }, config);

console.log(result.overallScore);
console.log(result.grade);
console.log(result.stages?.technicalEligibility.status);

const html = renderReport(result, { format: "html" });
const markdown = renderReport(result, { format: "md" });
const json = renderReport(result, { format: "json" });
```

`AnalyzerOptionsType` accepts `url` plus optional `signalsBase`, `timeout`, and `userAgent` values. Query, domain, engine, and scoring behavior belong to the configuration object.

## Configuration

`loadConfig()` searches upward from `process.cwd()` using the discovery order documented in the [CLI guide](CLI.md#configuration). Pass a path when your application starts elsewhere:

```typescript
const config = await loadConfig("/path/to/aiseo.config.json");
```

Use `loadConfigWithPath()` when the resolved config path is also needed, such as for tracked history.

## Analyze a Sitemap

```typescript
import { analyzeSitemap, loadConfig, renderSitemapReport } from "aiseo-audit";

const config = await loadConfig();
const result = await analyzeSitemap(
  { sitemapUrl: "https://example.com/sitemap.xml" },
  config,
);

const report = renderSitemapReport(result, { format: "html" });
```

Sitemap options also accept `signalsBase`, `timeout`, and `userAgent`. Processing is sequential and sitemap indexes are followed through five levels.

## Compare Results

`computeDiff(current, baseline)` compares two analyzer results and returns the overall, category, stage, and per-query deltas that are available.

```typescript
import { computeDiff, loadBaselineResult, renderDiffReport } from "aiseo-audit";

const baseline = await loadBaselineResult("./previous-audit.json");
const diff = computeDiff(result, baseline);
const markdown = renderDiffReport(result, diff, { format: "md" });
```

For the complete tracked-history workflow, use `orchestrateDiff()`. `renderHistoryTimeline(diffMap, { format })` renders the URL history map maintained in config.

## Recompute Pipeline Stages

`computeStages(categories, rawData, { queries, domain })` recomputes the four pipeline stages. `makeDiagnostic()` creates an unscored diagnostic factor for extensions that need to preserve observations outside score denominators.

## Runtime Exports

```typescript
import {
  analyzeUrl,
  analyzeSitemap,
  computeDiff,
  computeStages,
  loadBaselineResult,
  loadConfig,
  loadConfigWithPath,
  makeDiagnostic,
  orchestrateDiff,
  renderDiffReport,
  renderHistoryTimeline,
  renderReport,
  renderSitemapReport,
  FetchError,
} from "aiseo-audit";
```

## Exported Types

```typescript
import type {
  AiseoConfigType,
  AnalyzerOptionsType,
  AnalyzerResultType,
  AuditResultType,
  CategoryDeltaType,
  CategoryNameType,
  CategoryResultType,
  CategoryWeightType,
  DiffEntryType,
  DiffResultType,
  DomainOptionType,
  DomainSignalsType,
  EngineProfileType,
  EvidenceTierType,
  ExternalLinkType,
  FactorResultType,
  FetchErrorCode,
  FetchResultType,
  GateResultType,
  GradeType,
  OrchestrateDiffInputs,
  OrchestrateDiffOutcome,
  PageStatsType,
  ExtractedPageType,
  RecommendationType,
  RenderOptionsType,
  ReportFormatType,
  ScoreSummaryType,
  SitemapOptionsType,
  SitemapResultType,
  SitemapUrlResultType,
  StageNameType,
  StageScoresType,
  StageScoreType,
  StageWeightType,
} from "aiseo-audit";
```

This list mirrors the public type exports in `src/index.ts`.

## Recommendation Shape

```typescript
type RecommendationType = {
  category: string;
  factor: string;
  currentValue: string;
  priority: "high" | "medium" | "low";
  recommendation: string;
  auditPoints?: number;
  evidence?: EvidenceTierType;
  citations?: string[];
  direction?: "simplify" | "deepen" | "shorten" | "expand" | "add" | "remove";
  steps?: string[];
  codeExample?: string;
  learnMoreUrl?: string;
};
```

`auditPoints` is the factor's internal audit weight, not a predicted or additive change in citation probability.

## Error Handling

Network failures from the HTTP layer can be identified with `FetchError` and its `FetchErrorCode`. Schema validation and configuration errors are regular errors. Applications should also account for response variability: deterministic scoring assumes identical fetched HTML, tool version, and configuration.

The analyzer parses fetched HTML and does not execute client-side JavaScript or inspect a rendered browser layout. See the [README limitations](../README.md#limitations) before integrating it into a quality gate.
