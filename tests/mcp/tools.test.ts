import { describe, expect, it, vi } from "vitest";
import { ZodType } from "zod";
import { auditUrlConfig } from "../../src/mcp/schema.js";
import { handleAuditUrl } from "../../src/mcp/tools.js";
import type { AnalyzerResultType } from "../../src/modules/analyzer/schema.js";
import type { AiseoConfigType } from "../../src/modules/config/schema.js";

type TextContentBlock = { type: "text"; text: string };

function makeResult(): AnalyzerResultType {
  return {
    url: "https://example.com",
    signalsBase: "https://example.com",
    analyzedAt: "2026-04-17T00:00:00Z",
    overallScore: 72,
    grade: "C-",
    totalPoints: 300,
    maxPoints: 420,
    categories: {},
    recommendations: [],
    rawData: { title: "", metaDescription: "", wordCount: 100 },
    meta: { version: "1.5.0", analysisDurationMs: 100 },
  };
}

function makeConfig(): AiseoConfigType {
  return {
    timeout: 45000,
    userAgent: "test",
    format: "pretty",
    weights: {
      contentExtractability: 1,
      contentStructure: 1,
      answerability: 1,
      entityClarity: 1,
      groundingSignals: 1,
      authorityContext: 1,
      readabilityForCompression: 1,
    },
  };
}

describe("auditUrlConfig metadata", () => {
  it("carries a non-empty description so MCP clients can surface intent", () => {
    expect(auditUrlConfig.description).toBeDefined();
    expect(auditUrlConfig.description.length).toBeGreaterThan(20);
  });

  it("advertises url as a required zod-typed input", () => {
    const urlSchema = auditUrlConfig.inputSchema.url;
    expect(urlSchema).toBeInstanceOf(ZodType);
    expect(urlSchema.isOptional()).toBe(false);
  });

  it("advertises timeout as an optional zod-typed number", () => {
    const timeoutSchema = auditUrlConfig.inputSchema.timeout;
    expect(timeoutSchema).toBeInstanceOf(ZodType);
    expect(timeoutSchema.isOptional()).toBe(true);
  });
});

describe("handleAuditUrl", () => {
  it("invokes analyzeUrl with the provided url and returns the result as JSON text", async () => {
    const analyzeUrl = vi.fn().mockResolvedValue(makeResult());
    const loadConfig = vi.fn().mockResolvedValue(makeConfig());

    const response = await handleAuditUrl(
      { url: "https://example.com" },
      { analyzeUrl, loadConfig },
    );

    expect(analyzeUrl).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://example.com" }),
      expect.anything(),
    );
    expect(response.content[0].type).toBe("text");
    const text = (response.content[0] as TextContentBlock).text;
    const parsed = JSON.parse(text);
    expect(parsed.overallScore).toBe(72);
  });

  it("forwards an optional timeout to analyzeUrl", async () => {
    const analyzeUrl = vi.fn().mockResolvedValue(makeResult());
    const loadConfig = vi.fn().mockResolvedValue(makeConfig());

    await handleAuditUrl(
      { url: "https://example.com", timeout: 12000 },
      { analyzeUrl, loadConfig },
    );

    expect(analyzeUrl).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://example.com", timeout: 12000 }),
      expect.anything(),
    );
  });

  it("returns an error response when analyzeUrl throws", async () => {
    const analyzeUrl = vi.fn().mockRejectedValue(new Error("fetch failed"));
    const loadConfig = vi.fn().mockResolvedValue(makeConfig());

    const response = await handleAuditUrl(
      { url: "https://example.com" },
      { analyzeUrl, loadConfig },
    );

    expect(response.isError).toBe(true);
    expect((response.content[0] as TextContentBlock).text).toContain(
      "fetch failed",
    );
  });
});
