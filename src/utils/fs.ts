import { access, writeFile as fsWriteFile, stat } from "node:fs/promises";

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

export async function assertOutputPathIsNotDirectory(
  path: string,
): Promise<void> {
  try {
    const stats = await stat(path);
    if (stats.isDirectory()) {
      throw new Error(
        `Output path "${path}" is a directory. Pass a file path such as ${path.replace(/\/$/, "")}/report.html.`,
      );
    }
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") return;
    throw err;
  }
}
