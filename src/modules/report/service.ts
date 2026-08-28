import type { AnalyzerResultType } from "../analyzer/schema.js";
import type { AiseoConfigType } from "../config/schema.js";
import type { DiffResultType } from "../diff/schema.js";
import type { SitemapResultType } from "../sitemap/schema.js";
import type { ReportFormatType, RenderOptionsType } from "./schema.js";
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
  DIFF_SLOT_MARKER,
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

type DiffMapType = NonNullable<AiseoConfigType["diff"]>;

export function renderReport(
  result: AnalyzerResultType,
  options: RenderOptionsType,
): string {
  const renderers = renderersFor(options.format);
  return options.tldrOnly ? renderers.tldr(result) : renderers.report(result);
}

export function renderDiffReport(
  result: AnalyzerResultType,
  diff: DiffResultType,
  options: RenderOptionsType,
): string {
  const renderers = renderersFor(options.format);
  const base = options.tldrOnly
    ? renderers.tldr(result)
    : renderers.report(result);
  return renderers.composeDiff(base, diff);
}

export function renderHistoryTimeline(
  diffMap: DiffMapType,
  options: RenderOptionsType,
): string {
  return renderersFor(options.format).timeline(diffMap);
}

export function renderSitemapReport(
  result: SitemapResultType,
  options: RenderOptionsType,
): string {
  return renderersFor(options.format).sitemap(result);
}

type RendererSetType = {
  report: (result: AnalyzerResultType) => string;
  tldr: (result: AnalyzerResultType) => string;
  sitemap: (result: SitemapResultType) => string;
  timeline: (diffMap: DiffMapType) => string;
  composeDiff: (base: string, diff: DiffResultType) => string;
};

const RENDERERS: Record<ReportFormatType, RendererSetType> = {
  pretty: {
    report: renderPretty,
    tldr: renderPrettyTldr,
    sitemap: renderSitemapPretty,
    timeline: renderTimelinePretty,
    composeDiff: (base, diff) =>
      prependDiff(base, renderDiffBlockPretty(diff).join("\n")),
  },
  json: {
    report: renderJson,
    tldr: renderJsonTldr,
    sitemap: renderSitemapJson,
    timeline: renderTimelineJson,
    composeDiff: (base, diff) =>
      JSON.stringify({ ...JSON.parse(base), diff }, null, 2),
  },
  md: {
    report: renderMarkdown,
    tldr: renderMarkdownTldr,
    sitemap: renderSitemapMarkdown,
    timeline: renderTimelineMarkdown,
    composeDiff: (base, diff) =>
      insertUnderDocumentH1(base, renderDiffBlockMarkdown(diff).join("\n")),
  },
  html: {
    report: renderHtml,
    tldr: renderHtmlTldr,
    sitemap: renderSitemapHtml,
    timeline: renderTimelineHtml,
    composeDiff: (base, diff) =>
      replaceLiterally(base, DIFF_SLOT_MARKER, renderDiffBlockHtml(diff)),
  },
};

function renderersFor(format: ReportFormatType | undefined): RendererSetType {
  return RENDERERS[format ?? "pretty"] ?? RENDERERS.pretty;
}

function prependDiff(base: string, diffText: string): string {
  return `${diffText}\n\n${base}`;
}

function insertUnderDocumentH1(document: string, block: string): string {
  const h1 = document.match(/^# .+\n/);
  if (!h1) return prependDiff(document, block);
  const insertAt = h1[0].length;
  return `${document.slice(0, insertAt)}\n${block}\n${document.slice(insertAt)}`;
}

function replaceLiterally(
  text: string,
  marker: string,
  replacement: string,
): string {
  return text.replace(marker, () => replacement);
}
