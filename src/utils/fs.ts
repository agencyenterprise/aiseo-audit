import { access, writeFile as fsWriteFile, stat } from "node:fs/promises";
import { dirname } from "node:path";

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function writeOutputFile(
  path: string,
  content: string,
): Promise<void> {
  await fsWriteFile(path, content, "utf-8");
}

export async function assertWritableOutputPath(path: string): Promise<void> {
  const stats = await statOrNull(path);
  if (stats === null) {
    await assertParentDirectoryExists(path);
    return;
  }
  if (stats.isDirectory()) {
    throw new Error(
      `Output path "${path}" is a directory. Pass a file path such as ${path.replace(/\/$/, "")}/report.html.`,
    );
  }
}

async function statOrNull(path: string) {
  try {
    return await stat(path);
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

async function assertParentDirectoryExists(path: string): Promise<void> {
  const parent = dirname(path);
  if (!(await fileExists(parent))) {
    throw new Error(
      `Output directory "${parent}" does not exist. Create it first or pass a different --out path.`,
    );
  }
}
