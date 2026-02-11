import { extractPage } from './service.js';
import { normalizeError } from '../errors/service.js';
import type { ExtractedPage } from './schema.js';
import type { NormalizedError } from '../errors/schema.js';

export function extractPageSafe(
  html: string,
  url: string
): { data: ExtractedPage } | { error: NormalizedError } {
  try {
    const data = extractPage(html, url);
    return { data };
  } catch (err) {
    const normalized = normalizeError(err);
    normalized.code = 'PARSE_ERROR';
    return { error: normalized };
  }
}
