import type { AnalyzerResultType } from "../analyzer/schema.js";
import type { RenderOptions } from "./schema.js";
import { renderHtml } from "./support/html.js";
import { renderJson } from "./support/json.js";
import { renderMarkdown } from "./support/markdown.js";
import { renderPretty } from "./support/pretty.js";

export function renderReport(
  result: AnalyzerResultType,
  options: RenderOptions,
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
