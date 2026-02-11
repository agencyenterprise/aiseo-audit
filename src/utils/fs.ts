import { readFile, writeFile as fsWriteFile, access } from 'node:fs/promises';
import type { ZodType } from 'zod';

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(path: string, schema: ZodType<T>): Promise<T> {
  const content = await readFile(path, 'utf-8');
  const parsed = JSON.parse(content);
  return schema.parse(parsed);
}

export async function writeOutputFile(path: string, content: string): Promise<void> {
  await fsWriteFile(path, content, 'utf-8');
}
