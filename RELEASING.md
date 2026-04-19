# Releasing a New Version

## Prerequisites

- All PRs merged to `main`
- CI is green on `main`
- You're on the `main` branch locally

## Steps

### 1. Checkout and pull main

```bash
git checkout main
git pull origin main
```

### 2. Bump the version

Run ONE of these commands in your terminal:

```bash
npm version patch   # 1.0.0 → 1.0.1 (bug fixes)
npm version minor   # 1.0.0 → 1.1.0 (new features)
npm version major   # 1.0.0 → 2.0.0 (breaking changes)
```

This command does three things automatically:

- Updates `version` in `package.json`
- Creates a git commit (e.g., "v1.0.1")
- Creates a git tag (e.g., `v1.0.1`)

### 3. Push the commit and tag

```bash
git push origin main --tags
```

### 4. Create the GitHub Release

1. Go to the repo on GitHub
2. Click **Releases** (right sidebar)
3. Click **Draft a new release**
4. **Choose a tag**: Select the tag you just pushed (e.g., `v1.0.1`)
5. **Release title**: Same as tag (e.g., `v1.0.1`)
6. **Description**: Write what changed (see example below)
7. Click **Publish release**

### Example Release Notes

```markdown
## What's New

- Added support for X
- Improved performance of Y

## Bug Fixes

- Fixed issue with Z

## Breaking Changes

- None
```

> **Tip**: Click "Generate release notes" in GitHub to auto-generate a commit list, then edit it to be human-readable.

## Version Naming

| Type      | When to use                       | Example       |
| --------- | --------------------------------- | ------------- |
| **patch** | Bug fixes, minor improvements     | 1.0.0 → 1.0.1 |
| **minor** | New features, backward compatible | 1.0.0 → 1.1.0 |
| **major** | Breaking changes                  | 1.0.0 → 2.0.0 |

## Version in Code

The version string is read from `package.json` at build time via tsup's `define` option. Running `npm version` + `npm run build` keeps everything in sync automatically. There is no need to update version strings manually anywhere in the source code.

## Publishing the GitHub Action to the Marketplace

The repo ships a reusable GitHub Action via `action.yml` at the root. The npm package and the Action are published independently — the npm release publishes to npm, the Marketplace listing lives on a GitHub Release.

### First-time Marketplace listing

Do this once, on the release immediately after `action.yml` is added to `main`:

1. Draft the release as usual (steps 1–4 above)
2. On the draft release page, scroll to **"Publish this Action to the GitHub Marketplace"** and check the box
3. Accept the Marketplace terms of service if prompted
4. Pick a **Primary category**: `Utilities`
5. Pick a **Secondary category**: `Continuous integration`
6. Click **Publish release**

The Action is now live at `github.com/marketplace/actions/ai-seo-audit` and users can reference it with:

```yaml
- uses: agencyenterprise/aiseo-audit@v1
  with:
    url: https://yoursite.com
    fail-under: 70
```

### Every subsequent release

1. Cut the release normally (steps 1–4 above)
2. On the release page, the same Marketplace checkbox appears. Leave it checked so the listing updates to point at the new tag
3. **Update the floating `v1` tag** so users on `@v1` get the new version:

```bash
git tag -f v1
git push -f origin v1
```

This is industry convention (see `actions/checkout`, `actions/setup-node`). Users pin to `@v1` for stability and get non-breaking improvements automatically.

### Major version bumps

When releasing a `v2.0.0` with breaking changes to the Action's `inputs` or `outputs`:

1. Create a new floating `v2` tag alongside `v1`
2. Do **not** delete `v1` — keep it pointing at the latest `v1.x` so existing users are not broken
3. Announce the `@v2` migration path in the release notes

## Publishing the MCP Server

The package ships an MCP server via the `aiseo-audit-mcp` bin entry. It's distributed through npm and listed in the [official MCP Registry](https://registry.modelcontextprotocol.io) at `io.github.agencyenterprise/aiseo-audit`. The official registry is the canonical metadata source for the MCP ecosystem (backed by Anthropic, GitHub, PulseMCP, and Microsoft). Downstream aggregators like Smithery, mcp.so, and PulseMCP scrape it on an hourly cadence, so **one registry publish propagates to every marketplace automatically**.

### How users install it

Once a version is on npm, users wire it into any MCP client with a single config block:

```json
// ~/.cursor/mcp.json  or  Claude Desktop config
{
  "mcpServers": {
    "aiseo-audit": {
      "command": "npx",
      "args": ["-y", "aiseo-audit-mcp"]
    }
  }
}
```

`npx -y` pulls the latest `aiseo-audit` package (which contains the `aiseo-audit-mcp` bin) on first run.

### Prerequisites (one-time setup)

- `package.json` contains `"mcpName": "io.github.agencyenterprise/aiseo-audit"` (links the npm package to the registry entry).
- `server.json` exists at the repo root and declares the server metadata. The MCP Registry validates that `server.json.name` matches `package.json.mcpName`.
- `NPM_TOKEN` is stored as a repo secret for the publish workflow. No additional secret is required for the MCP Registry — authentication uses GitHub OIDC from the Actions runner.

### Automated publishing (recommended)

`.github/workflows/publish-mcp.yml` runs on every `v*` tag push. It:

1. Runs `npm run ci` (format + lint + tests + build).
2. Publishes the package to npm.
3. Syncs `server.json`'s `version` fields to the release tag via `jq`.
4. Authenticates to the MCP Registry with GitHub OIDC (no secret required).
5. Runs `mcp-publisher publish`.

So the full release flow becomes: `npm version minor` → `git push origin main --tags` → the workflow handles npm and the MCP Registry together. Create the GitHub Release afterwards as usual (the workflow does not draft releases).

### Manual publish (dry run or recovery)

Install the CLI once:

```bash
brew install mcp-publisher
# or download a release binary: https://github.com/modelcontextprotocol/registry/releases
```

Publish from the repo root after a successful `npm publish`:

```bash
mcp-publisher login github        # opens a GitHub device-code flow in your browser
mcp-publisher publish             # reads server.json and submits to the registry
```

### Verify the listing

After the workflow succeeds, confirm the server is live:

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.agencyenterprise/aiseo-audit"
```

The response should include the latest version. Within an hour or two, the listing propagates to aggregators like [Smithery](https://smithery.ai) and [mcp.so](https://mcp.so) automatically.

### Testing the MCP server locally before release

Verify the `initialize` + `tools/list` handshake works over stdio:

```bash
npm run build
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n' | node bin/aiseo-audit-mcp.js
```

Expected: two JSON-RPC response lines on stdout. The first confirms the protocol handshake, the second lists the `audit_url` tool with its input schema.

### Registry notes

- **The MCP Registry is in preview.** Breaking changes or data resets may occur before GA. Keep `server.json` committed so reruns are idempotent.
- **Namespace ownership.** The `io.github.agencyenterprise/` prefix is tied to the GitHub organization. Only members with push access can publish under that name (via GitHub OIDC from this repo's workflows).
