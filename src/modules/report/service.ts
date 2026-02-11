import type { AnalyzerResult } from '../analyzer/schema.js';
import type { RenderOptions } from './schema.js';
import { renderPretty } from './support/pretty.js';
import { renderJson } from './support/json.js';
import { renderMarkdown } from './support/markdown.js';

export function renderReport(
  result: AnalyzerResult,
  options: RenderOptions
): string {
  switch (options.format) {
    case 'json':
      return renderJson(result);
    case 'md':
      return renderMarkdown(result);
    case 'pretty':
    default:
      return renderPretty(result);
  }
}
