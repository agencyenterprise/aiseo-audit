import type { AnalyzerResult } from '../../analyzer/schema.js';

export function renderJson(result: AnalyzerResult): string {
  return JSON.stringify(result, null, 2);
}
