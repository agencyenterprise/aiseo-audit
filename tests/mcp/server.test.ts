import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";
import { createMcpServer } from "../../src/mcp/server.js";
import type { AuditUrlDependencies } from "../../src/mcp/tools.js";
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

async function connectInMemory(
  analyzeUrl: ReturnType<typeof vi.fn>,
  loadConfig: ReturnType<typeof vi.fn>,
) {
  const server = createMcpServer({
    analyzeUrl: analyzeUrl as unknown as AuditUrlDependencies["analyzeUrl"],
    loadConfig: loadConfig as unknown as AuditUrlDependencies["loadConfig"],
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client(
    { name: "aiseo-audit-mcp-test", version: "1.0.0" },
    { capabilities: {} },
  );
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return { client, server };
}

describe("MCP server round-trip over InMemoryTransport", () => {
  it("advertises the audit_url tool in tools/list", async () => {
    const { client } = await connectInMemory(
      vi.fn().mockResolvedValue(makeResult()),
      vi.fn().mockResolvedValue(makeConfig()),
    );

    const response = await client.listTools();

    expect(response.tools).toHaveLength(1);
    expect(response.tools[0].name).toBe("audit_url");
    expect(response.tools[0].inputSchema.required).toContain("url");
  });

  it("invokes audit_url with a client request and returns the serialized result", async () => {
    const analyzeUrl = vi.fn().mockResolvedValue(makeResult());
    const loadConfig = vi.fn().mockResolvedValue(makeConfig());
    const { client } = await connectInMemory(analyzeUrl, loadConfig);

    const response = await client.callTool({
      name: "audit_url",
      arguments: { url: "https://example.com" },
    });

    expect(analyzeUrl).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://example.com" }),
      expect.anything(),
    );
    const content = response.content as TextContentBlock[];
    const parsed = JSON.parse(content[0].text);
    expect(parsed.overallScore).toBe(72);
  });

  it("returns an error response when the audit throws", async () => {
    const analyzeUrl = vi.fn().mockRejectedValue(new Error("fetch failed"));
    const loadConfig = vi.fn().mockResolvedValue(makeConfig());
    const { client } = await connectInMemory(analyzeUrl, loadConfig);

    const response = await client.callTool({
      name: "audit_url",
      arguments: { url: "https://example.com" },
    });

    expect(response.isError).toBe(true);
    const content = response.content as TextContentBlock[];
    expect(content[0].text).toContain("fetch failed");
  });

  it("returns a validation error for a tool call with no url, without invoking the audit handler", async () => {
    const analyzeUrl = vi.fn();
    const loadConfig = vi.fn();
    const { client } = await connectInMemory(analyzeUrl, loadConfig);

    const response = await client.callTool({
      name: "audit_url",
      arguments: {},
    });

    expect(response.isError).toBe(true);
    const content = response.content as TextContentBlock[];
    expect(content[0].text).toMatch(/validation|invalid/i);
    expect(analyzeUrl).not.toHaveBeenCalled();
  });
});
