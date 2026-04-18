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

The package ships an MCP server via the `aiseo-audit-mcp` bin entry. It is distributed **through npm** (published automatically with every npm release) and additionally listed on third-party MCP registries so Cursor, Claude Desktop, and Windsurf users can discover it.

### How users install it

No extra step required on their end — once a version is published to npm, users can wire it into any MCP client with a single config block:

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

`npx -y` pulls the latest published version of `aiseo-audit` (which contains the `aiseo-audit-mcp` bin) on first run.

### First-time registry listings

Do this once, after the release that first ships `aiseo-audit-mcp`:

1. **[modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)** (community registry on GitHub)
   - Fork the repo
   - Add a row for `aiseo-audit` in the community servers list with a short description and link to the package
   - Open a PR

2. **[smithery.ai](https://smithery.ai)** — the largest third-party MCP marketplace
   - Sign in with GitHub
   - Click **Submit a server**
   - Fill in name (`aiseo-audit`), description, install command (`npx -y aiseo-audit-mcp`), and link to the GitHub repo

3. **[mcp.so](https://mcp.so)** — secondary marketplace, similar submission flow

### Every subsequent release

Nothing to do. The npm publish automatically ships the latest `aiseo-audit-mcp` to every user running `npx -y aiseo-audit-mcp`. The registry entries continue to point at the npm package, so they stay current without manual updates.

### Testing the MCP server locally before release

Verify the `initialize` + `tools/list` handshake works over stdio:

```bash
npm run build
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n' | node bin/aiseo-audit-mcp.js
```

Expected: two JSON-RPC response lines on stdout — one confirming the protocol handshake, the second listing the `audit_url` tool with its input schema.
