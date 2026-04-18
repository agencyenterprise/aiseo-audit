import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VERSION } from "../modules/analyzer/constants.js";
import { auditUrlConfig } from "./schema.js";
import { handleAuditUrl, type AuditUrlDependencies } from "./tools.js";

export function createMcpServer(deps?: AuditUrlDependencies): McpServer {
  const server = new McpServer(
    { name: "aiseo-audit", version: VERSION },
    { capabilities: { tools: {} } },
  );

  server.registerTool("audit_url", auditUrlConfig, async (args) =>
    handleAuditUrl(args, deps),
  );

  return server;
}
