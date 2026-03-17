import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileExists, writeOutputFile } from "../../src/utils/fs.js";

describe("fileExists", () => {
  it("returns true when the file exists", async () => {
    const path = join(import.meta.dirname, "tmp-exists.txt");
    await writeFile(path, "content");
    try {
      expect(await fileExists(path)).toBe(true);
    } finally {
      await rm(path);
    }
  });

  it("returns false when the file does not exist", async () => {
    const path = join(import.meta.dirname, "nonexistent-file-xyz.txt");
    expect(await fileExists(path)).toBe(false);
  });
});

describe("writeOutputFile", () => {
  const testDir = join(import.meta.dirname, "tmp-write-test");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("writes content to the specified path", async () => {
    const path = join(testDir, "output.txt");
    await writeOutputFile(path, "hello world");
    expect(await fileExists(path)).toBe(true);
  });

  it("overwrites existing file content", async () => {
    const path = join(testDir, "output.txt");
    await writeOutputFile(path, "first");
    await writeOutputFile(path, "second");
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(path, "utf-8");
    expect(content).toBe("second");
  });
});
