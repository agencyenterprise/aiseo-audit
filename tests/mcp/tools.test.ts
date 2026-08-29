import { describe, expect, it, vi } from "vitest";
import { ZodType } from "zod";
import { auditUrlConfig } from "../../src/mcp/schema.js";
import { handleAuditUrl } from "../../src/mcp/tools.js";
import { makeConfig } from "../helpers/config.js";
import { makeResult } from "../helpers/results.js";

type TextContentBlock = { type: "text"; text: string };

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

describe("auditUrlConfig description contract", () => {
  it("frames the audit as stage-scored and heuristic, not research-backed", () => {
    expect(auditUrlConfig.description).toContain("pipeline-stage scores");
    expect(auditUrlConfig.description).toContain("technical eligibility");
    expect(auditUrlConfig.description).toContain("evidence-tiered factors");
    expect(auditUrlConfig.description).toContain(
      "research-informed heuristic audit, not a citation-probability predictor",
    );
    expect(auditUrlConfig.description).not.toContain("7-category");
    expect(auditUrlConfig.description).not.toContain("research-backed");
  });

  it("advertises queries and domain as optional zod-typed inputs", () => {
    expect(auditUrlConfig.inputSchema.queries).toBeInstanceOf(ZodType);
    expect(auditUrlConfig.inputSchema.queries.isOptional()).toBe(true);
    expect(auditUrlConfig.inputSchema.domain).toBeInstanceOf(ZodType);
    expect(auditUrlConfig.inputSchema.domain.isOptional()).toBe(true);
  });

  it("caps queries at 10", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => `query ${i}`);
    expect(auditUrlConfig.inputSchema.queries.safeParse(eleven).success).toBe(
      false,
    );
    expect(
      auditUrlConfig.inputSchema.queries.safeParse(eleven.slice(0, 10)).success,
    ).toBe(true);
  });
});

describe("handleAuditUrl audit target inputs", () => {
  it("threads queries into the config passed to analyzeUrl", async () => {
    const analyzeUrl = vi.fn().mockResolvedValue(makeResult());
    const loadConfig = vi.fn().mockResolvedValue(makeConfig());

    await handleAuditUrl(
      { url: "https://example.com", queries: ["best crm software"] },
      { analyzeUrl, loadConfig },
    );

    expect(analyzeUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ queries: ["best crm software"] }),
    );
  });

  it("threads domain into the config passed to analyzeUrl", async () => {
    const analyzeUrl = vi.fn().mockResolvedValue(makeResult());
    const loadConfig = vi.fn().mockResolvedValue(makeConfig());

    await handleAuditUrl(
      { url: "https://example.com", domain: "product" },
      { analyzeUrl, loadConfig },
    );

    expect(analyzeUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ domain: "product" }),
    );
  });

  it("keeps the loaded config values when queries and domain are omitted", async () => {
    const analyzeUrl = vi.fn().mockResolvedValue(makeResult());
    const loadConfig = vi
      .fn()
      .mockResolvedValue(makeConfig({ queries: ["from config"] }));

    await handleAuditUrl(
      { url: "https://example.com" },
      { analyzeUrl, loadConfig },
    );

    expect(analyzeUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ queries: ["from config"], domain: "auto" }),
    );
  });
});
