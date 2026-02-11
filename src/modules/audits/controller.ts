import { runAudits } from './service.js';
import { normalizeError } from '../errors/service.js';
import type { ExtractedPage } from '../extractor/schema.js';
import type { FetchResult } from '../fetcher/schema.js';
import type { AuditResult } from './schema.js';
import type { NormalizedError } from '../errors/schema.js';

export function runAuditsSafe(
  page: ExtractedPage,
  fetchResult: FetchResult
): { data: AuditResult } | { error: NormalizedError } {
  try {
    const data = runAudits(page, fetchResult);
    return { data };
  } catch (err) {
    const normalized = normalizeError(err);
    normalized.code = 'PARSE_ERROR';
    return { error: normalized };
  }
}
