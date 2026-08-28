# aiseo-audit-mcp

Launcher package for the [aiseo-audit](https://www.npmjs.com/package/aiseo-audit) MCP server.

This package exists so that MCP client configs can use `npx -y aiseo-audit-mcp` directly (npx resolves that token as a package name). It contains no logic of its own: it depends on `aiseo-audit` and executes its `aiseo-audit-mcp` entry point. Publishing it under this name also prevents the name from being claimed by a third party.

```json
{
  "mcpServers": {
    "aiseo-audit": {
      "command": "npx",
      "args": ["-y", "aiseo-audit-mcp"]
    }
  }
}
```

See the [aiseo-audit README](https://github.com/agencyenterprise/aiseo-audit#use-with-ai-assistants-mcp) for full documentation.

## License

MIT
