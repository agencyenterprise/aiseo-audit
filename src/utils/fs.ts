import { access, writeFile as fsWriteFile } from "node:fs/promises";

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
