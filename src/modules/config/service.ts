import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileExists } from "../../utils/fs.js";
import { CONFIG_FILENAMES } from "./constants.js";
import { GeoJsonConfigSchema, type GeoJsonConfigType } from "./schema.js";

async function findConfigFile(startDir: string): Promise<string | null> {
  let dir = resolve(startDir);

  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const candidate = join(dir, filename);
      if (await fileExists(candidate)) return candidate;
    }

    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function loadConfig(
  configPath?: string,
): Promise<GeoJsonConfigType> {
  if (configPath) {
    const content = await readFile(resolve(configPath), "utf-8");
    return GeoJsonConfigSchema.parse(JSON.parse(content));
  }

  const found = await findConfigFile(process.cwd());
  if (found) {
    const content = await readFile(found, "utf-8");
    return GeoJsonConfigSchema.parse(JSON.parse(content));
  }

  return GeoJsonConfigSchema.parse({});
}
