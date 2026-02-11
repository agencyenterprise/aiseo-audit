import { loadConfig } from './service.js';
import { normalizeError } from '../errors/service.js';
import type { GeoJsonConfig } from './schema.js';
import type { NormalizedError } from '../errors/schema.js';

export async function loadConfigSafe(
  configPath?: string
): Promise<{ data: GeoJsonConfig } | { error: NormalizedError }> {
  try {
    const data = await loadConfig(configPath);
    return { data };
  } catch (err) {
    const normalized = normalizeError(err);
    normalized.code = 'CONFIG_ERROR';
    return { error: normalized };
  }
}
