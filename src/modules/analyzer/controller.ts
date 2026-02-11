import { analyzeUrl } from './service.js';
import { normalizeError } from '../errors/service.js';
import type { GeoJsonConfig } from '../config/schema.js';
import type { AnalyzerOptions, AnalyzerResult } from './schema.js';
import type { NormalizedError } from '../errors/schema.js';

export async function analyzeUrlSafe(
  options: AnalyzerOptions,
  config: GeoJsonConfig
): Promise<{ data: AnalyzerResult } | { error: NormalizedError }> {
  try {
    const data = await analyzeUrl(options, config);
    return { data };
  } catch (err) {
    return { error: normalizeError(err) };
  }
}
