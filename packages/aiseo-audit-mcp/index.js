#!/usr/bin/env node
// Thin launcher so `npx -y aiseo-audit-mcp` resolves to a real package.
// The MCP server itself lives in the aiseo-audit package.
require("aiseo-audit/mcp");
