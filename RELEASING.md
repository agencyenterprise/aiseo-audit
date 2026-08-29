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

### 2. Update CHANGELOG.md

Move the `Unreleased` entry to the new version number with today's date, and commit it
before bumping. Every release gets a CHANGELOG entry (Keep a Changelog format).

### 4. Bump the version

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

### 4. Push the commit and tag

```bash
git push origin main --tags
```

### 5. Publish to npm

```bash
npm publish
```

`prepublishOnly` runs the full CI script (format check, typecheck, tests with coverage, build) before anything is uploaded, so a broken build cannot ship. Verify the publish with `npm view aiseo-audit version`.

### 6. Create the GitHub Release

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

The package ships an MCP server via the `aiseo-audit-mcp` bin entry. It's distributed through npm and listed in the [official MCP Registry](https://registry.modelcontextprotocol.io) at `io.github.agencyenterprise/aiseo-audit`. The registry is the canonical metadata source for the MCP ecosystem (backed by Anthropic, GitHub, PulseMCP, and Microsoft). Downstream aggregators like Smithery, mcp.so, and PulseMCP scrape it on an hourly cadence, so one registry publish propagates to every marketplace automatically.

### How users install it

Once a version is on npm, users wire it into any MCP client with a single config block:

```json
// ~/.cursor/mcp.json  or  Claude Desktop config
{
  "mcpServers": {
    "aiseo-audit": {
      "command": "npx",
      "args": ["-y", "-p", "aiseo-audit", "aiseo-audit-mcp"]
    }
  }
}
```

npx resolves the token after `-y` as a PACKAGE name, so `-p aiseo-audit` is required to install the `aiseo-audit` package and run its `aiseo-audit-mcp` bin. The MCP Registry is for discovery, not runtime resolution: users always get whatever is current on npm.

A companion launcher package lives in `packages/aiseo-audit-mcp/`. Publishing it (once, plus whenever its `aiseo-audit` dependency range needs a bump) makes the shorter `npx -y aiseo-audit-mcp` form work directly, keeps the name from being claimed by a third party, and is what the MCP Registry entry points at. Publish it only after the `aiseo-audit` version it depends on is live on npm (it requires `aiseo-audit/mcp`, available from v1.6.0). The full ordered flow is in "How to publish" below.

### Prerequisites (one-time setup)

- `packages/aiseo-audit-mcp/package.json` contains `"mcpName": "io.github.agencyenterprise/aiseo-audit"` (links the npm package to the registry entry). The registry entry points at the `aiseo-audit-mcp` launcher package because its single bin matches its package name, so registry-driven clients can run `npx aiseo-audit-mcp` directly; pointing at `aiseo-audit` would make them launch the CLI bin instead.
- `server.json` exists at the repo root and declares the server metadata. The MCP Registry validates that `server.json.name` matches the referenced npm package's `mcpName`.
- `mcp-publisher` CLI installed locally: `brew install mcp-publisher` (or download a release binary from [github.com/modelcontextprotocol/registry/releases](https://github.com/modelcontextprotocol/registry/releases)).

### When to publish

**Most releases do NOT need an MCP Registry publish.** The registry stores metadata, not code, so version bumps alone don't require a re-publish. Only re-publish when one of these changes in `server.json`:

- Server description
- Transport type (e.g., stdio → http)
- Environment variables the server needs
- Tool surface (new tool added, schema change)
- Package identifier on npm (e.g., if we ever rename the package)

Patch and minor npm releases that don't touch `server.json` can ship to npm alone. Users running the npx command get the latest code regardless of what the registry says.

### How to publish (when needed)

Publish order matters: `aiseo-audit` must be on npm first (the launcher depends on its `aiseo-audit/mcp` export), then the launcher, then the registry metadata (the registry validates that the referenced npm package exists and carries the matching `mcpName`).

```bash
# 1. Publish the main package (see the npm steps above)
npm publish

# 2. Publish the launcher the registry points at
(cd packages/aiseo-audit-mcp && npm publish)

# 3. First time only: authenticate (opens a GitHub device-code flow in your browser)
mcp-publisher login github

# 4. Sync server.json: its own version tracks the aiseo-audit release,
#    packages[0].version tracks the launcher
VERSION=$(node -p "require('./package.json').version")
MCP_VERSION=$(node -p "require('./packages/aiseo-audit-mcp/package.json').version")
jq --arg v "$VERSION" --arg mv "$MCP_VERSION" '.version = $v | .packages[0].version = $mv' server.json > server.tmp.json
mv server.tmp.json server.json

# 5. Publish metadata to the registry
mcp-publisher publish
```

Commit the updated `server.json` on the same branch/release so the repo and registry agree. Steps 1-2 repeat on every release that should reach npm; steps 3-5 only when `server.json` metadata changes.

### Verify the listing

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.agencyenterprise/aiseo-audit"
```

The response should include the version you just published. Within an hour or two, the listing propagates to aggregators like [Smithery](https://smithery.ai) and [mcp.so](https://mcp.so) automatically.

### Version drift is expected

Because we only re-publish when metadata changes, the version in the registry will often lag behind npm. That's by design — users install via `npx -y` and get the real latest from npm. If you ever want the registry to reflect npm exactly, run the publish snippet above on any release. Otherwise treat `server.json`'s version as "what the registry knows," not "what npm has."

### Testing the MCP server locally before release

Verify the `initialize` + `tools/list` handshake works over stdio:

```bash
npm run build
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n' | node bin/aiseo-audit-mcp.js
```

Expected: two JSON-RPC response lines on stdout. The first confirms the protocol handshake, the second lists the `audit_url` tool with its input schema.

### Registry notes

- **The MCP Registry is in preview.** Breaking changes or data resets may occur before GA. Keep `server.json` committed so reruns are idempotent.
- **Namespace ownership.** The `io.github.agencyenterprise/` prefix is tied to the GitHub organization. Only members of that organization can publish under that name via `mcp-publisher login github`.

## Releasing 2.0.0 specifically

Ordered checklist for the research-driven major (details in docs/MIGRATION-2.0.md):

1. **Before 2.0 reaches npm (protects `@v1` Action users):** on the 1.x line, change the
   Action's `version` input default from `latest` to `1`, cut a final 1.x release, and
   re-point the floating tag: `git tag -f v1 && git push -f origin v1`. Without this, every
   `@v1` consumer silently executes 2.0 the moment it becomes `latest`.
2. Standard steps above (`npm version major`, push tags, `npm publish`).
3. GitHub Release for `v2.0.0` (Marketplace checkbox on), then create the floating tag:
   `git tag v2 && git push origin v2`. Keep `v1` alive.
4. MCP, in order: publish `packages/aiseo-audit-mcp` 2.0.0 (already pinned to `^2.0.0`),
   confirm `server.json` versions (already synced to 2.0.0), then republish the registry
   entry with `mcp-publisher` (required this release: the tool description changed).
5. One to two weeks later, deprecate the 1.x line:

   ```bash
   npm deprecate "aiseo-audit@<2.0.0" "Superseded by the research-driven 2.0 (evidence-tiered factors, pipeline-stage scores). Migration: https://github.com/agencyenterprise/aiseo-audit/blob/main/docs/MIGRATION-2.0.md"
   npm deprecate "aiseo-audit-mcp@1.0.0" "Pins aiseo-audit 1.x forever. Use aiseo-audit-mcp 2.x."
   ```

   Quote the version range so the shell does not interpret `<`. Deprecation is reversible by
   running the same command with an empty message.
