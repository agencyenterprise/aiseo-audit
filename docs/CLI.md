# CLI and Configuration Guide

This guide covers every `aiseo-audit` command-line option, output mode, and configuration field. For a shorter introduction, start with the [project README](../README.md).

## Installation

Requires Node.js 20.19 or later and npm 10 or later.

```bash
# Run without installing.
npx aiseo-audit https://example.com

# Install as a project-local development tool.
npm install --save-dev aiseo-audit

# Install globally.
npm install -g aiseo-audit
```

## Options

| Option                 | Description                                                                  | Default                       |
| ---------------------- | ---------------------------------------------------------------------------- | ----------------------------- |
| `[url]`                | URL to audit                                                                 | —                             |
| `--sitemap <url>`      | Audit all URLs in a sitemap                                                  | —                             |
| `--signals-base <url>` | Base URL for `robots.txt`, `llms.txt`, and `llms-full.txt`                   | Audited URL or sitemap origin |
| `--query <query>`      | Target query; repeatable, maximum ten across flags and config                | —                             |
| `--domain <type>`      | Page profile: `auto`, `product`, or `informational`                          | `auto`                        |
| `--engine <preset>`    | Experimental category weighting: `generic`, `gemini`, `gpt`, or `perplexity` | `generic`                     |
| `--json`               | Render JSON                                                                  | —                             |
| `--md`                 | Render Markdown                                                              | —                             |
| `--html`               | Render HTML                                                                  | —                             |
| `--out <path>`         | Write output to a file and infer format from `.json`, `.md`, or `.html`      | —                             |
| `--fail-under <n>`     | Exit with code 1 when the score is below `n`                                 | —                             |
| `--timeout <ms>`       | HTTP request timeout in milliseconds                                         | `45000`                       |
| `--user-agent <ua>`    | HTTP User-Agent                                                              | `AISEOAudit/<version>`        |
| `--config <path>`      | Load an explicit config file                                                 | Auto-discovered               |
| `--tldr`               | Emit only the score and top three fixes                                      | —                             |
| `--diff`               | Record the run and compare it with the previous tracked run                  | —                             |
| `--all`                | With `--diff` and no URL, render every tracked URL                           | —                             |
| `--baseline <path>`    | Compare with a JSON result without updating tracked history                  | —                             |

Provide either `[url]` or `--sitemap`, except when using `--diff --all`. Pass at most one explicit output-format flag. Explicit flags take precedence over an extension inferred from `--out`, which takes precedence over the configured default format.

## Target Queries and Page Profiles

### Target queries

The repeatable `--query` option enables the Query Alignment category. It measures term coverage in structural fields and body content plus aspect coverage for every supplied query.

```bash
aiseo-audit https://example.com/guide \
  --query "how to set up sso" \
  --query "saml vs oidc" \
  --query "sso troubleshooting checklist"
```

Up to ten queries are accepted across CLI flags and config. About five usually gives a more stable measurement than a single query. The category uses the weakest query rather than the average and includes per-query detail in JSON output.

### Domain profiles

`--domain auto|product|informational` selects the page profile. Auto-detection uses Product or Offer JSON-LD and related signals.

Product pages receive the conditional Product Fit category for price, technical specifications, and comparison content. They also receive a missing-price Citation Fitness gate. Informational pages receive an explanatory-depth check instead.

### Engine presets

`--engine generic|gemini|gpt|perplexity` applies an experimental, static category-weight overlay. Presets reweight existing categories; they do not change measurements. Treat them as starting points rather than validated per-engine models.

## Output Formats

### Terminal

The default terminal report includes the overall score, four pipeline stages, category and factor details, evidence-tier badges, and recommendations.

```bash
aiseo-audit https://example.com
```

### JSON

JSON contains all score, stage, factor, evidence, raw-data, and recommendation fields. It is the best format for integrations.

```bash
aiseo-audit https://example.com --json
```

### Markdown

Markdown includes stage and category tables, factor details, and recommendations with steps and code examples when available.

```bash
aiseo-audit https://example.com --md
```

### HTML

HTML is a self-contained report with inline styling and SVG charts.

```bash
aiseo-audit https://example.com --out report.html
```

### TL;DR

`--tldr` emits only the score and top three highest-weight fixes. It works with every output format and can be combined with `--out`.

```bash
aiseo-audit https://example.com --tldr
aiseo-audit https://example.com --tldr --out summary.json
```

TL;DR is available for single-page audits and diffs. It cannot be combined with `--sitemap`.

## Tracking Results Over Time

`--diff` records an audit and compares it with the previous tracked run for the normalized URL.

```bash
# Establish a baseline.
aiseo-audit https://example.com --diff

# Record another run and display changes.
aiseo-audit https://example.com --diff
```

Each run writes a full JSON result beneath `historyDir` and appends a history entry to the discovered config. Config writes are atomic and paths are stored relative to the config file.

`--diff` is the only option that writes files without `--out`. If config discovery finds no file, it creates `aiseo.config.json` in the current directory. Add the history directory to `.gitignore` for local-only tracking, or commit it when the audit history should travel with the repository.

Example managed history:

```json
{
  "historyDir": "./audits",
  "diff": {
    "https://example.com": [
      {
        "path": "audits/example-2026-04-10.json",
        "timestamp": "2026-04-10T12:00:00.000Z",
        "score": 59
      }
    ]
  }
}
```

### Save a formatted report too

`--diff` always writes the JSON baseline. Add `--out` to save a human-readable report separately:

```bash
aiseo-audit https://example.com --diff --out ./audits/report.html
```

### Explicit baseline

`--baseline` compares a live result with a specific prior JSON file and does not update history:

```bash
aiseo-audit https://example.com --baseline ./previous-audit.json
```

### Cross-URL timeline

```bash
aiseo-audit --diff --all
aiseo-audit --diff --all --out timeline.html
```

The timeline displays every URL in the configured history with score progression and an inline chart in HTML.

## Sitemap Audits

```bash
aiseo-audit --sitemap https://example.com/sitemap.xml
aiseo-audit --sitemap https://example.com/sitemap.xml --out report.html
aiseo-audit --sitemap https://example.com/sitemap.xml --fail-under 70
```

The result contains:

- The average score and grade plus successful and failed URL counts.
- Site-wide category averages.
- A host-level profile of site-name consistency, Organization schema, bylines, and about/contact presence.
- Per-URL scores, grades, and leading recommendations.

Sitemap indexes are traversed and flattened through five levels. Domain signals are fetched once and reused across every URL. URLs are processed sequentially with no CLI URL cap, so scope large sitemaps intentionally.

The default domain-signal location is the sitemap origin. Override it when a subdirectory deployment or other topology needs a different base:

```bash
aiseo-audit \
  --sitemap https://example.com/projects/sitemap.xml \
  --signals-base https://example.com
```

`--diff`, `--baseline`, and `--tldr` are not supported with sitemap audits.

## Domain Signals and User Agent

The audit requests:

- `robots.txt` for crawler access policy.
- `llms.txt` as an unscored experimental diagnostic.
- `llms-full.txt` as an unscored experimental diagnostic.

The default User-Agent is `AISEOAudit/<version>`. Use `--user-agent` when you need to test content independently from unknown-bot handling:

```bash
aiseo-audit https://example.com --user-agent "MyBot/1.0"
```

This changes only the request header, not the audit logic. Page, sitemap, and domain-signal requests use the configured User-Agent.

## Local Development

```bash
aiseo-audit http://localhost:3000
```

The audit analyzes the HTML returned by the local server. It does not execute client-side JavaScript or inspect a browser-rendered DOM, so server-rendered and pre-rendered content is visible while client-only content may be absent.

Local domain-signal results can differ from production when `robots.txt`, `llms.txt`, or `llms-full.txt` is configured at the CDN or hosting layer.

## Configuration

The CLI searches from the current directory toward the filesystem root, stopping at the first matching file in this order:

1. `aiseo.config.json`
2. `.aiseo.config.json`
3. `aiseo-audit.config.json`

Pass `--config path/to/config.json` to bypass discovery.

### Fields

| Field           | Type                                        | Default                | Purpose                                          |
| --------------- | ------------------------------------------- | ---------------------- | ------------------------------------------------ |
| `timeout`       | positive number                             | `45000`                | Per-request timeout in milliseconds              |
| `userAgent`     | string                                      | `AISEOAudit/<version>` | HTTP User-Agent                                  |
| `format`        | `pretty`, `json`, `md`, or `html`           | `pretty`               | Default output format                            |
| `failUnder`     | 0–100                                       | Unset                  | Score threshold that produces exit code 1        |
| `queries`       | string array                                | `[]`                   | Target queries, maximum ten                      |
| `domain`        | `auto`, `product`, or `informational`       | `auto`                 | Page profile                                     |
| `engine`        | `generic`, `gemini`, `gpt`, or `perplexity` | `generic`              | Experimental weight preset                       |
| `weights`       | category-weight object                      | Every category `1`     | Relative category weights                        |
| `stageWeights`  | stage-weight object                         | Unset                  | Compute the overall score from stage percentages |
| `historyDir`    | string                                      | `./audits`             | Storage used by `--diff`                         |
| `diff`          | URL-to-history map                          | Unset                  | History managed by the CLI                       |
| `schemaVersion` | integer                                     | Unset                  | Reserved result/config compatibility metadata    |

### Representative example

```json
{
  "timeout": 45000,
  "format": "pretty",
  "queries": ["how to audit ai seo", "ai seo checklist"],
  "domain": "auto",
  "engine": "generic",
  "weights": {
    "contentExtractability": 1,
    "structuralAlignment": 1,
    "contentStructure": 1,
    "answerability": 1,
    "queryAlignment": 1,
    "entityClarity": 1,
    "groundingSignals": 1,
    "authorityContext": 1,
    "productFit": 1,
    "readabilityForCompression": 1
  },
  "historyDir": "./audits"
}
```

`failUnder` is deliberately omitted because no universal passing threshold is configured by default. Establish one from your own page baselines.

Set a weight to `2` to double its relative importance or `0` to exclude the category. Query Alignment and Product Fit participate only when active. Missing category keys default to `1`, including when loading a seven-key v1 weights object.

When `stageWeights` is present, the overall score is computed from the four stage percentages instead of category weights:

```json
{
  "stageWeights": {
    "technicalEligibility": 1,
    "retrievalAlignment": 1,
    "citationFitness": 1,
    "provenance": 1
  }
}
```

## Exit Codes

| Code | Meaning                                              |
| ---- | ---------------------------------------------------- |
| `0`  | Successful audit and threshold met                   |
| `1`  | Score below `--fail-under` or configured `failUnder` |
| `2`  | Invalid usage or runtime error                       |

## Compatibility Notes

- Node.js 20.19 or later is required because the CommonJS launchers load ESM-only dependencies through `require(esm)` support.
- The library exports support both ESM and CommonJS.
- Programmatic consumers that also use Zod should use Zod 4 or later to avoid type incompatibilities.
- See [MIGRATION-2.0.md](MIGRATION-2.0.md) when upgrading results, config, CI thresholds, or the GitHub Action from 1.x.
