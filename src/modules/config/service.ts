import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileExists } from "../../utils/fs.js";
import { CONFIG_FILENAMES } from "./constants.js";
import { AiseoConfigSchema, type AiseoConfigType } from "./schema.js";

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
): Promise<AiseoConfigType> {
  if (configPath) {
    const resolvedPath = resolve(configPath);
    const content = await readFile(resolvedPath, "utf-8");
    try {
      return AiseoConfigSchema.parse(JSON.parse(content));
    } catch (err) {
      throw new Error(
        `Invalid config file "${resolvedPath}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const found = await findConfigFile(process.cwd());
  if (found) {
    const content = await readFile(found, "utf-8");
    try {
      return AiseoConfigSchema.parse(JSON.parse(content));
    } catch (err) {
      throw new Error(
        `Invalid config file "${found}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return AiseoConfigSchema.parse({});
}
