import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileExists } from "../../utils/fs.js";
import { CONFIG_FILENAMES } from "./constants.js";
import { AiseoConfigSchema, type AiseoConfigType } from "./schema.js";

type AiseoConfigPatchType = Partial<
  Pick<AiseoConfigType, "diff" | "historyDir">
>;

export type LoadedConfigType = {
  config: AiseoConfigType;
  path: string | null;
};

export async function loadConfigWithPath(
  configPath?: string,
): Promise<LoadedConfigType> {
  if (configPath) {
    const resolvedPath = resolve(configPath);
    if (!(await fileExists(resolvedPath))) {
      throw new Error(
        `Config file not found at "${resolvedPath}". Check the --config path.`,
      );
    }
    return { config: await parseConfigFile(resolvedPath), path: resolvedPath };
  }

  const found = await findConfigFile(process.cwd());
  if (found) {
    return { config: await parseConfigFile(found), path: found };
  }

  return { config: AiseoConfigSchema.parse({}), path: null };
}

export async function loadConfig(
  configPath?: string,
): Promise<AiseoConfigType> {
  return (await loadConfigWithPath(configPath)).config;
}

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

async function parseConfigFile(path: string): Promise<AiseoConfigType> {
  const content = await readFile(path, "utf-8");
  try {
    return AiseoConfigSchema.parse(JSON.parse(content));
  } catch (err) {
    throw new Error(
      `Invalid config file "${path}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function updateConfig(
  configPath: string,
  patch: AiseoConfigPatchType,
): Promise<void> {
  const resolvedPath = resolve(configPath);
  const existing = await readExistingConfig(resolvedPath);
  const merged = { ...existing, ...patch };
  try {
    AiseoConfigSchema.parse(merged);
  } catch (err) {
    throw new Error(
      `Refusing to write invalid config to "${resolvedPath}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFileAtomically(
    resolvedPath,
    `${JSON.stringify(merged, null, 2)}\n`,
  );
}

async function writeFileAtomically(
  path: string,
  contents: string,
): Promise<void> {
  const tempPath = `${path}.tmp-${process.pid}`;
  await writeFile(tempPath, contents, "utf-8");
  await rename(tempPath, path);
}

async function readExistingConfig(
  resolvedPath: string,
): Promise<Record<string, unknown>> {
  if (!(await fileExists(resolvedPath))) return {};
  const content = await readFile(resolvedPath, "utf-8");
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Cannot update config: "${resolvedPath}" contains invalid JSON.`,
    );
  }
}
