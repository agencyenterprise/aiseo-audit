import type { AnalyzerResultType } from "../analyzer/schema.js";
import type { SitemapResultType } from "../sitemap/schema.js";
import type { RenderOptionsType } from "./schema.js";
import { renderHtml, renderSitemapHtml } from "./support/html.js";
import { renderJson, renderSitemapJson } from "./support/json.js";
import { renderMarkdown, renderSitemapMarkdown } from "./support/markdown.js";
import { renderPretty, renderSitemapPretty } from "./support/pretty.js";

export function renderReport(
  result: AnalyzerResultType,
  options: RenderOptionsType,
): string {
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
