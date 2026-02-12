import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../../../src/modules/config/service.js";

describe("loadConfig", () => {
  const testDir = join(tmpdir(), `geoaudit-test-${Date.now()}`);
  const subDir = join(testDir, "subdir", "nested");

  beforeEach(async () => {
    await mkdir(subDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe("with explicit config path", () => {
    it("loads config from explicit path", async () => {
      const configPath = join(testDir, "custom.json");
      await writeFile(
        configPath,
        JSON.stringify({ timeout: 30000, format: "json" }),
      );

      const config = await loadConfig(configPath);

      expect(config.timeout).toBe(30000);
      expect(config.format).toBe("json");
    });

    it("throws for missing explicit config", async () => {
      const configPath = join(testDir, "nonexistent.json");

      await expect(loadConfig(configPath)).rejects.toThrow();
    });

    it("throws for invalid JSON", async () => {
      const configPath = join(testDir, "invalid.json");
      await writeFile(configPath, "not json");

      await expect(loadConfig(configPath)).rejects.toThrow();
    });

    it("throws for invalid config schema", async () => {
      const configPath = join(testDir, "invalid-schema.json");
      await writeFile(configPath, JSON.stringify({ timeout: "not a number" }));

      await expect(loadConfig(configPath)).rejects.toThrow();
    });
  });

  describe("defaults", () => {
    it("returns default config when no config found", async () => {
      const originalCwd = process.cwd();
      process.chdir(subDir);

      try {
        const config = await loadConfig();

        expect(config.timeout).toBe(45000);
        expect(config.format).toBe("pretty");
        expect(config.userAgent).toMatch(/^GEOAudit\/\d+\.\d+\.\d+$/);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("provides default weights", async () => {
      const config = await loadConfig();

      expect(config.weights.contentExtractability).toBe(1);
      expect(config.weights.contentStructure).toBe(1);
      expect(config.weights.answerability).toBe(1);
      expect(config.weights.entityClarity).toBe(1);
      expect(config.weights.groundingSignals).toBe(1);
      expect(config.weights.authorityContext).toBe(1);
      expect(config.weights.readabilityForCompression).toBe(1);
    });
  });

  describe("config merging", () => {
    it("merges partial config with defaults", async () => {
      const configPath = join(testDir, "partial.json");
      await writeFile(configPath, JSON.stringify({ timeout: 20000 }));

      const config = await loadConfig(configPath);

      expect(config.timeout).toBe(20000);
      expect(config.format).toBe("pretty");
      expect(config.userAgent).toMatch(/^GEOAudit\/\d+\.\d+\.\d+$/);
    });

    it("allows custom weights", async () => {
      const configPath = join(testDir, "weights.json");
      await writeFile(
        configPath,
        JSON.stringify({
          weights: {
            contentExtractability: 2,
            answerability: 0.5,
          },
        }),
      );

      const config = await loadConfig(configPath);

      expect(config.weights.contentExtractability).toBe(2);
      expect(config.weights.answerability).toBe(0.5);
      expect(config.weights.entityClarity).toBe(1);
    });

    it("accepts all valid formats", async () => {
      for (const format of ["pretty", "json", "md", "html"]) {
        const configPath = join(testDir, `format-${format}.json`);
        await writeFile(configPath, JSON.stringify({ format }));

        const config = await loadConfig(configPath);
        expect(config.format).toBe(format);
      }
    });
  });

  describe("failUnder option", () => {
    it("accepts failUnder threshold", async () => {
      const configPath = join(testDir, "threshold.json");
      await writeFile(configPath, JSON.stringify({ failUnder: 70 }));

      const config = await loadConfig(configPath);

      expect(config.failUnder).toBe(70);
    });

    it("defaults to undefined", async () => {
      const config = await loadConfig();

      expect(config.failUnder).toBeUndefined();
    });
  });
});
