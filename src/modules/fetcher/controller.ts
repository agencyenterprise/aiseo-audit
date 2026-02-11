import { fetchUrl } from './service.js';
import { normalizeError } from '../errors/service.js';
import type { FetchOptions, FetchResult } from './schema.js';
import type { NormalizedError } from '../errors/schema.js';

export async function fetchUrlSafe(
  options: FetchOptions
): Promise<{ data: FetchResult } | { error: NormalizedError }> {
  try {
    const data = await fetchUrl(options);
    return { data };
  } catch (err) {
    return { error: normalizeError(err) };
  }
}
