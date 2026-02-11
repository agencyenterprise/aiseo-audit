import { renderReport } from './service.js';
import { normalizeError } from '../errors/service.js';
import type { AnalyzerResult } from '../analyzer/schema.js';
import type { RenderOptions } from './schema.js';
import type { NormalizedError } from '../errors/schema.js';

export function renderReportSafe(
  result: AnalyzerResult,
  options: RenderOptions
): { data: string } | { error: NormalizedError } {
  try {
    const data = renderReport(result, options);
    return { data };
  } catch (err) {
    return { error: normalizeError(err) };
  }
}
