import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { GeoJsonConfigSchema, type GeoJsonConfig } from './schema.js';
import { DEFAULT_CONFIG_FILENAME } from './constants.js';
import { fileExists } from '../../utils/fs.js';

export async function loadConfig(configPath?: string): Promise<GeoJsonConfig> {
  if (configPath) {
    const content = await readFile(resolve(configPath), 'utf-8');
    return GeoJsonConfigSchema.parse(JSON.parse(content));
  }

  const defaultPath = resolve(process.cwd(), DEFAULT_CONFIG_FILENAME);
  if (await fileExists(defaultPath)) {
    const content = await readFile(defaultPath, 'utf-8');
    return GeoJsonConfigSchema.parse(JSON.parse(content));
  }

  return GeoJsonConfigSchema.parse({});
}
