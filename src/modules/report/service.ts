import type { AnalyzerResultType } from "../analyzer/schema.js";
import type { AiseoConfigType } from "../config/schema.js";
import type { DiffResultType } from "../diff/schema.js";
import type { SitemapResultType } from "../sitemap/schema.js";
import type { RenderOptionsType } from "./schema.js";
import {
  renderDiffBlockHtml,
  renderDiffBlockMarkdown,
  renderDiffBlockPretty,
  renderTimelineHtml,
  renderTimelineJson,
  renderTimelineMarkdown,
  renderTimelinePretty,
} from "./support/diff-render.js";
import {
  renderHtml,
  renderHtmlTldr,
  renderSitemapHtml,
} from "./support/html.js";
import {
  renderJson,
  renderJsonTldr,
  renderSitemapJson,
} from "./support/json.js";
import {
  renderMarkdown,
  renderMarkdownTldr,
  renderSitemapMarkdown,
} from "./support/markdown.js";
import {
  renderPretty,
  renderPrettyTldr,
  renderSitemapPretty,
} from "./support/pretty.js";

export function renderReport(
  result: AnalyzerResultType,
  options: RenderOptionsType,
): string {
  if (options.tldrOnly) return renderTldrOnly(result, options.format);

  switch (options.format) {
    case "json":
      return renderJson(result);
    case "md":
      return renderMarkdown(result);
    case "html":
      return renderHtml(result);
    case "pretty":
    default:
      return renderPretty(result);
  }
}

function renderTldrOnly(
  result: AnalyzerResultType,
  format: RenderOptionsType["format"],
): string {
  switch (format) {
    case "json":
      return renderJsonTldr(result);
    case "md":
      return renderMarkdownTldr(result);
    case "html":
      return renderHtmlTldr(result);
    case "pretty":
    default:
      return renderPrettyTldr(result);
  }
}

export function renderDiffReport(
  result: AnalyzerResultType,
  diff: DiffResultType,
  options: RenderOptionsType,
): string {
  switch (options.format) {
    case "json":
      return renderDiffReportJson(result, diff, options.tldrOnly);
    case "md":
      return renderDiffReportMarkdown(result, diff, options.tldrOnly);
    case "html":
      return renderDiffReportHtml(result, diff, options.tldrOnly);
    case "pretty":
    default:
      return renderDiffReportPretty(result, diff, options.tldrOnly);
  }
}

export function renderHistoryTimeline(
  diffMap: NonNullable<AiseoConfigType["diff"]>,
  options: RenderOptionsType,
): string {
  switch (options.format) {
    case "json":
      return renderTimelineJson(diffMap);
    case "md":
      return renderTimelineMarkdown(diffMap);
    case "html":
      return renderTimelineHtml(diffMap);
    case "pretty":
    default:
      return renderTimelinePretty(diffMap);
  }
}

function renderDiffReportPretty(
  result: AnalyzerResultType,
  diff: DiffResultType,
  tldrOnly?: boolean,
): string {
  const base = tldrOnly ? renderPrettyTldr(result) : renderPretty(result);
  const diffLines = renderDiffBlockPretty(diff);
  return `${diffLines.join("\n")}\n\n${base}`;
}

function renderDiffReportMarkdown(
  result: AnalyzerResultType,
  diff: DiffResultType,
  tldrOnly?: boolean,
): string {
  const base = tldrOnly ? renderMarkdownTldr(result) : renderMarkdown(result);
  const diffLines = renderDiffBlockMarkdown(diff);
  return `${diffLines.join("\n")}\n\n${base}`;
}

function renderDiffReportJson(
  result: AnalyzerResultType,
  diff: DiffResultType,
  tldrOnly?: boolean,
): string {
  const base = JSON.parse(
    tldrOnly ? renderJsonTldr(result) : renderJson(result),
  );
  return JSON.stringify({ ...base, diff }, null, 2);
}

function renderDiffReportHtml(
  result: AnalyzerResultType,
  diff: DiffResultType,
  tldrOnly?: boolean,
): string {
  const base = tldrOnly ? renderHtmlTldr(result) : renderHtml(result);
  const diffHtml = renderDiffBlockHtml(diff);
  return base.replace(
    '<div class="report">',
    `<div class="report">\n  ${diffHtml}\n`,
  );
}

export function renderSitemapReport(
  result: SitemapResultType,
  options: RenderOptionsType,
): string {
  switch (options.format) {
    case "json":
      return renderSitemapJson(result);
    case "md":
      return renderSitemapMarkdown(result);
    case "html":
      return renderSitemapHtml(result);
    case "pretty":
    default:
      return renderSitemapPretty(result);
  }
}
