# aiseo-audit

[![npm version](https://img.shields.io/npm/v/aiseo-audit.svg?color=F5B0A4)](https://www.npmjs.com/package/aiseo-audit)
[![npm downloads](https://img.shields.io/npm/dw/aiseo-audit?color=F5B0A4)](https://www.npmjs.com/package/aiseo-audit)
[![npm package size](https://img.shields.io/npm/unpacked-size/aiseo-audit?color=F5B0A4)](https://www.npmjs.com/package/aiseo-audit)
[![License: MIT](https://img.shields.io/badge/License-MIT-7EB6D7.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.19-7EB6D7.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-7EB6D7?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CI](https://github.com/agencyenterprise/aiseo-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/agencyenterprise/aiseo-audit/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/codecov/c/github/agencyenterprise/aiseo-audit?color=8FBC8F&label=coverage)](https://codecov.io/gh/agencyenterprise/aiseo-audit)
[![GitHub Stars](https://img.shields.io/github/stars/agencyenterprise/aiseo-audit?style=flat&color=8FBC8F)](https://github.com/agencyenterprise/aiseo-audit/stargazers)
![npm downloads](https://img.shields.io/npm/dt/aiseo-audit?label=Total%20Downloads)

<div align="center">
  <strong>Testing example</strong><br /><br />
  <img src="docs/assets/ai-seo-bad-site-example.gif" alt="Testing example" width="600" />
</div>

Deterministic CLI that audits web pages for **AI search readiness**. Think Lighthouse, but for how well AI engines can fetch, extract, understand, and cite your content.

**AI SEO measures how reusable your content is for generative engines, not traditional search rankings.** The score is a readiness audit, not a citation probability.

**Who is this for?** Content teams running pre-publish checks, developers gating deployments in CI/CD, and marketers auditing their own or competitor pages. If your content needs to be cited (not just ranked), this tool tells you where you stand.

- [Quick Start](#quick-start)
- [What the Audit Reports](#what-the-audit-reports)
- [Quick Summary Mode](#quick-summary-mode)
- [Target Queries, Domain Profiles, and Engine Presets](#target-queries-domain-profiles-and-engine-presets)
- [Tracking AI SEO Over Time](#tracking-ai-seo-over-time)
- [Use with AI Assistants (MCP)](#use-with-ai-assistants-mcp)
- [CI/CD](#cicd)
- [CLI Options](#cli-options)
- [Site-Wide Auditing](#site-wide-auditing)
- [Local Development](#local-development)
- [Audit Categories](#audit-categories)
- [Programmatic API](#programmatic-api)
- [Migrating from 1.x](#migrating-from-1x)
- [Compatibility Notes](#compatibility-notes)
- [Documentation](#documentation)

## What is AI SEO?

Traditional SEO optimizes for ranking in a list of links. **AI SEO** optimizes for being **cited** in generated answers. Different goal, different signals.

When someone asks ChatGPT, Claude, Perplexity, or Gemini a question, those engines fetch web content, extract the useful parts, and decide what to cite. AI SEO (also called Generative Engine Optimization or GEO) is the practice of structuring your content so that process works in your favor.

The field's origin is [Princeton's GEO paper](https://arxiv.org/abs/2311.09735) (KDD 2024), which showed that once a page is already in an engine's context, changing its content can change how much the engine uses it. Its headline numbers, though, were measured on a visibility metric that later peer-reviewed work showed does not measure citation preference ([C-SEO Bench, NeurIPS 2025](docs/paper-reviews/c-seo-bench-neurips-2025.md)). Since then the field has matured: ten newer peer-reviewed papers (2025-2026) were reviewed from their primary sources for this tool, and the audit's factors are built on that literature. See [docs/paper-reviews/](docs/paper-reviews/README.md) for the reviews and [docs/EMERGING_RESEARCH.md](docs/EMERGING_RESEARCH.md) for the synthesis.

Why does AI readiness matter as its own surface? Measurement of deployed engines shows that 53% of the domains Google AI Overview consults are outside the top-10 organic results, and 27% are outside the top-100 (Kirsten et al., [Findings of ACL 2026](docs/paper-reviews/characterizing-web-search-findings-acl-2026.md)). Pages that lose the classic ranking game still get cited by generative engines. AI readiness is a real, distinct target from classic rank.

aiseo-audit measures the signals that matter along that pipeline: can the content be fetched and extracted? Do its structural fields carry the terms that get it retrieved? Does it contain the content properties associated with being cited? It runs entirely locally with no AI API calls and no external services.

## How aiseo-audit Is Different

Most "AI readiness" audits check whether certain files and tags exist. Does the site have llms.txt? Is there a sitemap? Is JSON-LD present? Those are binary checks that tell you very little about whether AI engines will actually use your content.

aiseo-audit goes deeper:

- **Content analysis, not just tag detection.** NLP-based entity extraction, salience-driven structural alignment, lead summary detection, hedged-language measurement, readability floors, and boilerplate measurement. 50+ factors across 10 categories.
- **Research-informed heuristic scoring.** aiseo-audit is a research-informed heuristic audit. Every factor carries an evidence tier (supported / conditional / heuristic / diagnostic / experimental) mapped to peer-reviewed findings in [docs/EVIDENCE.md](docs/EVIDENCE.md). Weights and thresholds are expert-set heuristics, not fitted probabilities. Factors whose isolated causal tests came back null are reported as unscored diagnostics instead of quietly padding the score.
- **Pipeline-stage scores.** Beyond the overall score, the report rolls factors up into the stages engines actually apply: technical eligibility, retrieval alignment, citation fitness, and provenance. See [What the Audit Reports](#what-the-audit-reports).
- **Configurable weights.** Prioritize the categories that matter to your content via `aiseo.config.json`. Zero vendor lock-in.
- **Four output formats.** Pretty terminal, JSON, Markdown, and self-contained HTML reports.
- **No external services at runtime.** No API keys, no AI calls, no network requests beyond fetching the target URL and its domain signal files. Fully deterministic.

One honest caveat belongs right next to that determinism claim: the audit is deterministic, but engine behavior is not. At temperature 0, deployed engines changed 9 to 27% of their answer decisions within five minutes, and only 18% of Google AI Overview's cited pages recurred across two months, versus 45% for classic search (Kirsten et al., [Findings of ACL 2026](docs/paper-reviews/characterizing-web-search-findings-acl-2026.md)). Same URL, same score, every run of this tool; no tool can promise the same citation, and this one does not. The score is a readiness audit, not a citation probability.

## Quick Start

```bash
# Try it instantly, no install required
npx aiseo-audit https://yoursite.com
```

```bash
# As a project dependency
npm install aiseo-audit

# As a dev dependency
npm install --save-dev aiseo-audit

# Globally
npm install -g aiseo-audit
```

## Usage

```bash
# Pretty terminal output (default)
aiseo-audit https://example.com

# Quick summary only (top 3 fixes, skip the full breakdown)
aiseo-audit https://example.com --tldr

# Measure coverage against the queries you want to win (repeatable, max 10)
aiseo-audit https://example.com --query "best crm for startups" --query "crm pricing comparison"

# Treat the page as a product page (adds price, specs, comparison checks)
aiseo-audit https://example.com --domain product

# Experimental engine preset (reweights categories)
aiseo-audit https://example.com --engine perplexity

# Track score changes over time
aiseo-audit https://example.com --diff

# JSON output
aiseo-audit https://example.com --json

# Markdown output
aiseo-audit https://example.com --md

# HTML report (Lighthouse-style)
aiseo-audit https://example.com --html

# Write to a file, format is inferred from the extension automatically
aiseo-audit https://example.com --out report.html
aiseo-audit https://example.com --out report.md
aiseo-audit https://example.com --out report.json

# Explicit format flag still works and takes precedence
aiseo-audit https://example.com --html --out report.html

# CI/CD: fail if score below threshold
aiseo-audit https://example.com --fail-under 70

# Custom timeout
aiseo-audit https://example.com --timeout 30000

# Custom user agent
aiseo-audit https://example.com --user-agent "MyBot/1.0"

# Use config file
aiseo-audit https://example.com --config aiseo.config.json
```

## What the Audit Reports

Every report leads with the overall score and a rollup of the four pipeline stages a page passes through on its way to being cited:

```
  Overall Score: 33/100  Grade: F
  Points: 95/278

  Pipeline Stages:
    Technical Eligibility    PASS 96%
    Retrieval Alignment      8%
    Citation Fitness         27%
    Provenance               0%
```

- **Technical Eligibility** is a gate, not a dial. It fails when a blocker fires: the page could not be fetched, no usable text could be extracted, or every known AI crawler is blocked. A failed gate names its blockers, caps the overall score at 25 (grade F), and suppresses the downstream stage percentages, because nothing downstream matters for a page engines cannot get.
- **Retrieval Alignment** rolls up the factors that get a page retrieved and ranked into an engine's context: structural-field alignment, entities, topic consistency, structured data.
- **Citation Fitness** rolls up the content properties associated with being cited once in context. It carries **evidence gates** that cap the stage score (they never add points): a visibly stale date on a time-sensitive page, content that is off-topic for every target query (checked only when queries are configured), and a product page with no price information. Tripped gates are listed in the report with their cap.
- **Provenance** rolls up authorship, organization identity, and attribution hygiene.

Below the stages, factors are grouped into **10 categories**, two of them conditional: **Query Alignment** appears only when you supply target queries, and **Product Fit** appears only on product pages. Every factor line shows its evidence-tier badge:

```
  Content Extractability                     52/54 (96%)
    Fetch Success              12/12  HTTP 200 in 113ms          [supported]
    Boilerplate Ratio          12/12  0% boilerplate             [conditional]
    Word Count Adequacy        i unscored diagnostic  19 words   [diagnostic]
```

Factors marked `unscored diagnostic` are reported for information only. They are the factors whose isolated causal tests came back null (most pure-formatting checks) or whose evidence is purely observational, and they are excluded from every score and denominator. What each tier means, and the paper each factor traces to, lives in [docs/EVIDENCE.md](docs/EVIDENCE.md).

The report ends with the top 3 recommendations, ranked by **audit points**, the internal weight of each factor. Audit points are not additive citation-probability gains: the research is explicit that stacking optimizations does not stack their effects, so the report tells you to apply the top items and re-measure. The full recommendation list is available in the JSON output.

## Quick Summary Mode

Use `--tldr` to get just the score and the top 3 highest-impact fixes. No detailed category breakdown, no long recommendations list. Ideal for CI logs, Slack notifications, and quick pre-publish checks.

```bash
aiseo-audit https://example.com --tldr
```

```
============================================================
  AI SEO Audit
  https://example.com
============================================================

  Score: 33/100 Grade: F

  Top fixes:
    1. 18 audit pts  Topic Consistency  (Entity Clarity)
    2. 13 audit pts  Citation Patterns  (Grounding Signals)
    3. 13 audit pts  Lead Summary       (Answerability)

  Audit points are internal audit weights, not additive citation-probability gains. Apply the top items, then re-measure.
```

`--tldr` works with every output format (`--json`, `--md`, `--html`) so you can pipe it into any integration. Combine with `--out` to write a slim summary to a file. It applies to single-URL audits; combining it with `--sitemap` is rejected with an error.

## Target Queries, Domain Profiles, and Engine Presets

### Target queries

The strongest evidence in the reviewed literature is for query alignment: whether your page carries the terms and covers the aspects of the queries you want to answer. Supply the queries you care about with the repeatable `--query` flag (or the `queries` config field) and the audit adds the **Query Alignment** category, measuring term coverage in structural fields, term coverage in the body, and aspect coverage per query.

```bash
aiseo-audit https://example.com/guide \
  --query "how to set up sso" \
  --query "saml vs oidc" \
  --query "sso troubleshooting checklist"
```

Up to 10 queries are accepted (flags and config combined); about 5 gives a stable coverage measurement. Scoring is **worst-case**: the category scores your weakest query, not your average, because a page that serves 4 of 5 queries well still loses the fifth. The report names the worst query and shows per-query detail in the JSON output.

### Domain profiles

`--domain auto|product|informational` (default `auto`) selects the page profile. Auto-detection uses Product/Offer JSON-LD and related signals. Product pages get the conditional **Product Fit** category (price presence, technical specifications, comparison content) and the missing-price evidence gate; informational pages get an explanatory-depth check instead.

### Engine presets

`--engine generic|gemini|gpt|perplexity` (default `generic`) applies an **experimental** static category-weight overlay per engine family. Presets only reweight existing categories, never change measurements, and every preset run carries an experimental banner in the report. Treat them as a starting point, not a validated per-engine model.

## Tracking AI SEO Over Time

`--diff` records every audit and shows you what changed since the last run for the same URL.

> [!IMPORTANT]
> `--diff` is the only flag that writes files outside of `--out`. It records history in whichever config file discovery finds (`aiseo.config.json`, `.aiseo.config.json`, or `aiseo-audit.config.json`, searched upward from the current directory); only when none exists does it create a fresh `aiseo.config.json`. History entries store paths relative to the config file, so a committed `./audits/` directory keeps working on other machines and in CI. Everything is announced on stderr the moment it is created, and config writes are atomic. Add `./audits/` to `.gitignore` if you don't want the history in version control, or commit it to keep a record of AI SEO over time.

```bash
# First run establishes a baseline
aiseo-audit https://example.com --diff

# Subsequent runs show the delta
aiseo-audit https://example.com --diff
```

Output on the second run:

```
  Changes since baseline (2026-04-10 → 2026-04-17)
    Overall            59 → 68   (+9)
    Answerability      18 → 28   (+10)
    Grounding Signals  23 → 26   (+3)
```

**How it works.** Each `--diff` run writes a full JSON audit to `./audits/<slug>-<timestamp>.json` and appends an entry to `aiseo.config.json` under a `diff` key. Nothing is ever overwritten; every run is preserved so you can walk the history. Baselines recorded by 1.x still load, and diffing against them is supported (the report notes when a baseline was scored by v1 rules).

```json
{
  "historyDir": "./audits",
  "diff": {
    "https://example.com": [
      {
        "path": "audits/example-2026-04-10.json",
        "timestamp": "2026-04-10T…",
        "score": 59
      },
      {
        "path": "audits/example-2026-04-17.json",
        "timestamp": "2026-04-17T…",
        "score": 68
      }
    ]
  }
}
```

### Saving a formatted report alongside the baseline

`--diff` always writes the JSON baseline to `historyDir` automatically. If you also want a human-friendly report (HTML, Markdown, pretty), pass `--out` with a file path and the rendered report will be written there:

```bash
# Creates two files: the auto-named JSON baseline in ./audits/,
# and a rendered HTML report at ./audits/report.html.
aiseo-audit https://example.com --diff --html --out ./audits/report.html
```

`--out` never replaces the baseline. It's purely for the rendered report. If `--out` points at an existing directory, the audit exits early with a clear error rather than silently writing an invalid file.

### Cross-URL timeline

Drop the URL and pass `--diff --all` to see every tracked URL at a glance with a sparkline of its history:

```bash
aiseo-audit --diff --all
```

```
  Audit History (2 URLs tracked, 7 total runs)

  https://example.com       ▂▅▇▆  59 → 68 → 72 → 70
  https://another-site.com  ▇▇    72 → 72
```

Works with `--html` for a shareable timeline page with inline SVG line charts.

### Explicit baseline

If you want to compare against a specific prior JSON result without touching the tracked history, use `--baseline`:

```bash
aiseo-audit https://example.com --baseline ./previous-audit.json
```

## Use with AI Assistants (MCP)

aiseo-audit ships an [MCP](https://modelcontextprotocol.io) server so Cursor, Claude Desktop, Windsurf, and any other MCP client can call the `audit_url` tool inline in a chat. The tool accepts optional `queries` (max 10) and `domain` arguments, so an assistant can run a query-aware or product-page audit directly.

No install required; the server runs via `npx` from the published package.

**Cursor** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "aiseo-audit": {
      "command": "npx",
      "args": ["-y", "-p", "aiseo-audit", "aiseo-audit-mcp"]
    }
  }
}
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "aiseo-audit": {
      "command": "npx",
      "args": ["-y", "-p", "aiseo-audit", "aiseo-audit-mcp"]
    }
  }
}
```

Once configured, prompt your assistant naturally, e.g. "audit https://mysite.com for AI search readiness against the query 'best project tracker'", and it will invoke the tool and return a full audit inline.

## CI/CD

aiseo-audit ships an official [GitHub Action](https://github.com/marketplace/actions/ai-seo-audit). Drop it into any workflow to gate PRs on AI search readiness and post a sticky PR comment with the summary:

```yaml
# .github/workflows/aiseo-audit.yml
name: AI SEO Audit
on:
  pull_request:
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: agencyenterprise/aiseo-audit@v2
        with:
          url: https://yoursite.com
          fail-under: 70
          comment-on-pr: true
```

With `comment-on-pr: true`, the Action updates a single sticky comment on each PR with the score, grade, and top fixes, so reviewers see the impact of content changes inline. If you are still on `@v1`, see [Migrating from 1.x](#migrating-from-1x) before switching: 2.0 scores the same page differently, so pin `@v2` deliberately and recalibrate `fail-under`.

Prefer a one-liner without the Action wrapper? This still works:

```yaml
steps:
  - run: npx aiseo-audit https://yoursite.com --fail-under 70
```

**Using a preview deployment URL?** If your CI pipeline produces a dynamic URL (e.g. a Vercel or Netlify preview), capture it from a prior step and pass it in:

```yaml
jobs:
  deploy-and-audit:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to preview
        id: deploy
        run: echo "url=https://your-preview-url.vercel.app" >> $GITHUB_OUTPUT
        # Replace the above with your actual deploy step that outputs a URL

      - name: Run AI SEO Audit
        run: npx aiseo-audit ${{ steps.deploy.outputs.url }} --fail-under 70
```

The `--fail-under` threshold sets the minimum acceptable score. Exit code `1` is returned when the score falls below it, which GitHub Actions treats as a failed step.

## CLI Options

| Option                 | Description                                                                                                                                          | Default                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `[url]`                | URL to audit                                                                                                                                         | -                                          |
| `--sitemap <url>`      | Audit all URLs in a sitemap.xml                                                                                                                      | -                                          |
| `--signals-base <url>` | Base URL to fetch domain signals from (robots.txt, llms.txt, llms-full.txt)                                                                          | Origin of the URL or sitemap being audited |
| `--query <query>`      | Target query to measure coverage against; repeatable, max 10 combined with config queries, about 5 recommended. Enables the Query Alignment category | -                                          |
| `--domain <type>`      | Page domain profile: `auto`, `product`, or `informational`. Product pages get Product Fit checks                                                     | `auto`                                     |
| `--engine <preset>`    | Experimental engine preset that reweights categories: `generic`, `gemini`, `gpt`, `perplexity`                                                       | `generic`                                  |
| `--json`               | Output as JSON                                                                                                                                       | -                                          |
| `--md`                 | Output as Markdown                                                                                                                                   | -                                          |
| `--html`               | Output as HTML                                                                                                                                       | -                                          |
| `--out <path>`         | Write output to a file; format is inferred from `.html`, `.md`, `.json` extension                                                                    | -                                          |
| `--fail-under <n>`     | Exit with code 1 if score < threshold                                                                                                                | -                                          |
| `--timeout <ms>`       | Request timeout in ms                                                                                                                                | `45000`                                    |
| `--user-agent <ua>`    | Custom User-Agent string                                                                                                                             | `AISEOAudit/<version>`                     |
| `--config <path>`      | Path to config file                                                                                                                                  | -                                          |
| `--tldr`               | Emit only the TL;DR summary (no detailed breakdown)                                                                                                  | -                                          |
| `--diff`               | Track score over time: record this run, diff against the previous recorded run                                                                       | -                                          |
| `--all`                | With `--diff` and no URL, render audit history across all tracked URLs                                                                               | -                                          |
| `--baseline <path>`    | Diff against a specific prior JSON result (bypasses history tracking)                                                                                | -                                          |

Either `[url]` or `--sitemap` must be provided (or `--diff --all` for the cross-URL timeline). If no output flag is given, the default is `pretty` (color-coded terminal output). The default format can also be set in the config file.

When `--out` is provided, the format is automatically inferred from the file extension (`.html` becomes HTML, `.md` becomes Markdown, `.json` becomes JSON) so you don't need to pass a separate format flag. An explicit `--html`, `--md`, or `--json` flag takes precedence if provided.

## Site-Wide Auditing

Use `--sitemap` to audit every URL in a `sitemap.xml`. Domain signals (`robots.txt`, `llms.txt`, `llms-full.txt`) are fetched once and shared across all URL audits, not re-fetched per page.

By default, domain signals are fetched from the origin of the URL or sitemap being audited, because `robots.txt` lives at the origin root per RFC 9309 and `llms.txt` follows the same convention. For a sitemap at `https://example.com/projects/sitemap.xml`, the tool checks `https://example.com/robots.txt`, `https://example.com/llms.txt`, and `https://example.com/llms-full.txt`. If your signals live somewhere else (for example a subdirectory deployment), use `--signals-base` to specify the location explicitly.

```bash
# Audit all URLs in a sitemap
aiseo-audit --sitemap https://example.com/sitemap.xml

# With HTML output, format inferred from extension
aiseo-audit --sitemap https://example.com/sitemap.xml --out report.html

# Override where domain signals are fetched from (sitemap)
aiseo-audit --sitemap https://example.com/projects/sitemap.xml --signals-base https://example.com

# Override where domain signals are fetched from (single URL)
aiseo-audit https://example.com/projects/page --signals-base https://example.com

# Fail if average score across all URLs is below threshold
aiseo-audit --sitemap https://example.com/sitemap.xml --fail-under 70
```

The sitemap report includes:

- **Summary**: average score, grade, total/succeeded/failed URL counts
- **Site-wide category averages**: identify which audit categories are weakest across your whole site
- **Host profile**: descriptive site-level provenance facts (site-name uniformity, Organization schema coverage, byline coverage, about/contact presence)
- **Per-URL results**: individual score, grade, and top recommendation for each URL

Sitemap index files (sitemaps that reference other sitemaps) are supported, and all child sitemaps are fetched and flattened automatically. Every report format explicitly shows which URL domain signals were fetched from, so there is no guesswork about where `robots.txt`, `llms.txt`, and `llms-full.txt` were checked.

## User Agent

By default, all HTTP requests (page fetch, `robots.txt`, `llms.txt`) are sent with the header `User-Agent: AISEOAudit/<version>`. This is intentional. If a site blocks unknown bots, that is a meaningful negative signal for AI search readiness, and the audit should surface it as a failing "Fetch Success" score.

The `--user-agent` flag exists as an escape hatch for cases where you want to bypass bot detection and test the content independently of access policy. It does not change the audit logic, only what the server sees in the request header.

## Local Development

You can run the audit against a local dev server to iterate on your content before deploying:

```bash
aiseo-audit http://localhost:3000
```

The page analysis (content structure, readability, schema markup, answerability, etc.) works identically to a production audit. These factors depend on your HTML output, which is the same locally as it is in production.

### Domain Signal Files

The audit also checks for three domain-level files that AI crawlers look for:

- **`robots.txt`** controls which bots can access your site. AI crawlers (GPTBot, ClaudeBot, etc.) respect this file to determine whether they are allowed to fetch your content.
- **`llms.txt`** is a proposed standard that provides LLMs with a concise summary of your site's purpose, key pages, and preferred citation format. The audit reports it as an unscored experimental diagnostic: no reviewed paper found outcome evidence for it.
- **`llms-full.txt`** is the extended version of `llms.txt` with more comprehensive site documentation.

When auditing over HTTP, these files are checked against your local server. If your local server serves them, they will pass. If not, they will show as missing.

> [!NOTE]
> Local audit results may differ slightly from production. Domain signal files (`robots.txt`, `llms.txt`, `llms-full.txt`) are often configured at the hosting or CDN level and may not be present on your local dev server. Always verify these signals separately against your production domain.

## Audit Categories

> [!NOTE]
> AI SEO (e.g. GEO: Generative Engine Optimization) is a new and developing field. Methodologies and audit criteria evolve as research and engine behavior advance; every factor's evidence trail is maintained in [docs/EVIDENCE.md](docs/EVIDENCE.md).

The audit evaluates 10 categories of AI search readiness, two of them conditional (_[Detailed Breakdown here](docs/AUDIT_BREAKDOWN.md)_):

| Category                        | When scored              | What It Measures                                                                                  |
| ------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| **Content Extractability**      | Always                   | Can AI engines fetch the page, extract meaningful text, and get past paywalls and crawler blocks? |
| **Structural Alignment**        | Always                   | Do the title, meta description, headings, and JSON-LD carry the page's own salient terms?         |
| **Content Structure for Reuse** | Always                   | Is the heading hierarchy sound? (Most pure-formatting checks are unscored diagnostics in 2.0.)    |
| **Answerability**               | Always                   | Does the content lead with a summary and provide definitions, direct answers, and clear steps?    |
| **Query Alignment**             | Only with target queries | Does the page cover the terms and aspects of each target query? Scored by the worst query.        |
| **Entity Clarity**              | Always                   | Are named entities clearly present, consistent with the topic, and free of term over-repetition?  |
| **Grounding Signals**           | Always                   | Does the content cite sources, attribute claims, quantify statements, and avoid hedged language?  |
| **Authority Context**           | Always                   | Is there author attribution, organization identity, structured data, and appropriate freshness?   |
| **Product Fit**                 | Product pages only       | Does the page state a price, provide technical specifications, and offer comparison content?      |
| **Readability for Compression** | Always                   | Is the content above the readability floors? (Polishing already-readable text is not rewarded.)   |

### Interpreting Your Score

Grades follow a standard US academic scale with +/- sub-grades for granular tracking across iterations.

| Score  | Grade | What It Means                                                                                           |
| ------ | ----- | ------------------------------------------------------------------------------------------------------- |
| 93-100 | A     | Highly optimized. AI engines can fetch, understand, and cite your content with minimal friction.        |
| 90-92  | A-    | Near top tier. A handful of polish items stand between you and an A.                                    |
| 87-89  | B+    | Strong foundation with a few high-impact gaps worth closing.                                            |
| 83-86  | B     | Good foundation. Targeted improvements will push you into the top tier.                                 |
| 80-82  | B-    | Solid, but several category gaps are holding back citation potential.                                   |
| 77-79  | C+    | Above average. Structural or content gaps are limiting citation potential.                              |
| 73-76  | C     | Moderate readiness. Multiple categories need attention.                                                 |
| 70-72  | C-    | Below the comfort zone. Prioritize high-impact recommendations.                                         |
| 67-69  | D+    | Noticeable gaps across core signals.                                                                    |
| 63-66  | D     | Significant gaps. Core signals (structure, answerability, authority) need attention.                    |
| 60-62  | D-    | On the edge of failing. Most categories need meaningful work.                                           |
| 0-59   | F     | Not AI-ready. Start with Technical Eligibility. If the content cannot be fetched, nothing else matters. |

Two scoring rules keep the number honest:

- **Neutral and diagnostic factors are excluded from denominators.** A factor that does not apply to your page (for example, freshness on an evergreen topic) neither helps nor hurts, and unscored diagnostics never enter the math. Categories with nothing applicable to score are dropped from the weighted overall instead of dragging it down.
- **Failing Technical Eligibility caps the overall score at 25 (grade F).** A page that cannot be fetched, yields no usable text, or blocks every AI crawler cannot buy its way up with good content elsewhere.

The per-category breakdown in each report shows exactly where to focus. Start with high-priority recommendations in your lowest-scoring categories.

## Output Formats

### Pretty (default)

Color-coded terminal output with the pipeline-stage rollup, scores, factor breakdowns with evidence-tier badges, and recommendations. Where available, recommendations include numbered implementation steps, a ready-to-use code example, and a learn more link. Best for quick checks during development.

### JSON

Full structured output with all scores, stage results (including gate status), factor details with evidence tiers and citations, raw data, and the complete recommendations list. Best for integrations, CI/CD pipelines, and programmatic consumption.

### Markdown

Structured report with stage and category tables, factor details, and recommendations grouped by category. Recommendations with steps render as numbered lists; code examples render as fenced code blocks. Best for documentation, PRs, and sharing.

### HTML

Self-contained single-file report with SVG score gauges, the stage rollup, color-coded sections, and recommendations grouped by category. Recommendations with steps and code examples render as inline detail sections below each recommendation row. Best for stakeholder reports and visual review.

```bash
aiseo-audit https://example.com --out report.html
```

> **Tip:** Run this against your own site and open the file in a browser to get the most actionable view of where to focus. The HTML report is the closest equivalent to Lighthouse's output.

## Config File

Create a config file in your project root to customize behavior. The CLI automatically discovers your config by searching from the current directory up to the filesystem root, looking for (in order):

- `aiseo.config.json`
- `.aiseo.config.json`
- `aiseo-audit.config.json`

You can also pass an explicit path with `--config path/to/config.json`.

```json
{
  "timeout": 45000,
  "format": "pretty",
  "failUnder": 50,
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
  "historyDir": "./audits",
  "diff": {}
}
```

- **`queries`** (max 10): target queries for the Query Alignment category; the repeatable `--query` flag appends to this list.
- **`domain`**: `auto`, `product`, or `informational`; same as `--domain`.
- **`engine`**: `generic`, `gemini`, `gpt`, or `perplexity`; same as `--engine` (experimental presets).
- **`weights`**: relative category weights. Set a category to `2` to double its importance, or `0` to exclude it. `queryAlignment` and `productFit` only participate when their category is active. Old 7-key configs from 1.x still parse; missing keys default to `1`.
- **`stageWeights`** (optional): `{ "technicalEligibility": 1, "retrievalAlignment": 1, "citationFitness": 1, "provenance": 1 }`. When set, the overall score is computed from the four stage percentages with these weights instead of from category weights.
- **`historyDir`** controls where `--diff` writes audit JSONs (default `./audits`). `diff` is managed by the tool; each `--diff` run appends an entry keyed by URL. See [Tracking AI SEO Over Time](#tracking-ai-seo-over-time).

**Example: tuning for a blog or editorial site.** Content that needs to be cited should lead with answers and ground its claims. Emphasize answerability and grounding, and let query alignment do the targeting:

```json
{
  "format": "html",
  "failUnder": 65,
  "queries": ["your money query here", "your second query here"],
  "weights": {
    "contentExtractability": 2,
    "answerability": 2,
    "groundingSignals": 2,
    "queryAlignment": 2,
    "readabilityForCompression": 1
  }
}
```

**Example: tuning for a product or docs site.** Retrieval-facing structure and provenance matter more when content needs to be found and trusted:

```json
{
  "format": "html",
  "failUnder": 70,
  "domain": "product",
  "weights": {
    "contentExtractability": 2,
    "structuralAlignment": 2,
    "authorityContext": 2,
    "productFit": 2
  }
}
```

## Programmatic API

```typescript
import { analyzeUrl, loadConfig, renderReport } from "aiseo-audit";

const config = await loadConfig();
const result = await analyzeUrl({ url: "https://example.com" }, config);

console.log(result.overallScore); // 72
console.log(result.grade); // "B-"
console.log(result.stages?.technicalEligibility.status); // "pass"

// Render in any format
const html = renderReport(result, { format: "html" });
const md = renderReport(result, { format: "md" });
const json = renderReport(result, { format: "json" });
```

### Exported Types

```typescript
import type {
  AnalyzerResultType,
  AnalyzerOptionsType,
  AuditResultType,
  CategoryNameType,
  CategoryResultType,
  CategoryDeltaType,
  DiffEntryType,
  DiffResultType,
  DomainOptionType,
  EngineProfileType,
  EvidenceTierType,
  FactorResultType,
  GateResultType,
  RecommendationType,
  ReportFormatType,
  StageNameType,
  StageScoresType,
  StageWeightType,
  AiseoConfigType,
} from "aiseo-audit";
```

`RecommendationType` includes the base fields (`category`, `factor`, `currentValue`, `priority`, `recommendation`) plus optional fields populated where applicable:

```typescript
type RecommendationType = {
  category: string;
  factor: string;
  currentValue: string;
  priority: "high" | "medium" | "low";
  recommendation: string;
  auditPoints?: number; // the factor's internal audit weight, not a citation-probability gain
  evidence?: EvidenceTierType; // supported | conditional | heuristic | diagnostic | experimental
  citations?: string[]; // paper-review slugs under docs/paper-reviews/
  direction?: "simplify" | "deepen" | "shorten" | "expand" | "add" | "remove";
  steps?: string[]; // ordered implementation steps
  codeExample?: string; // ready-to-use code snippet
  learnMoreUrl?: string; // link to canonical spec or docs
};
```

`computeStages(categories, rawData, { queries, domain })` is exported for recomputing the pipeline-stage rollup, and `makeDiagnostic` for building unscored diagnostic factors.

### Diffing results programmatically

`computeDiff(current, baseline)` compares two `AnalyzerResultType` values and returns a `DiffResultType` with the overall delta and per-category deltas, including stage deltas and per-query coverage deltas where available. Pair with `renderDiffReport(result, diff, { format })` to render the diff in any format, or `renderHistoryTimeline(diffMap, { format })` to render a cross-URL timeline from a tracked history map.

## Philosophy

This tool measures **AI search reusability**: how well a page's content can be fetched, extracted, understood, and reused by AI engines like ChatGPT, Claude, Perplexity, and Gemini.

It is:

- **Deterministic**: No AI API calls. Same URL and content produce the same score.
- **Honest about what determinism buys**: The audit is repeatable; the engines are not. Deployed engines changed 9 to 27% of answer decisions within five minutes at temperature 0, and only 18% of Google AI Overview's cited pages recurred across two months (Kirsten et al., Findings of ACL 2026). Treat the score as a readiness audit, never as a citation probability.
- **Evidence-tiered**: Every factor is labeled by the strength of its evidence, and weights are expert-set heuristics, openly documented in [docs/EVIDENCE.md](docs/EVIDENCE.md).
- **Engine-agnostic by default**: The optional engine presets are labeled experimental.
- **Content-focused**: Analyzes what's on the page, not external signals.
- **Lightweight**: Fast CLI with minimal dependencies.

## Exit Codes

| Code | Meaning                                         |
| ---- | ----------------------------------------------- |
| `0`  | Success                                         |
| `1`  | Score below `--fail-under` threshold            |
| `2`  | Runtime error (fetch failed, invalid URL, etc.) |

## Migrating from 1.x

2.0 rescored the entire factor set against the peer-reviewed literature, so **scores shift wholesale**: the same page will score differently under 2.0, usually lower. That is the honesty working as intended, not a regression. The full breaking-changes table lives in [docs/MIGRATION-2.0.md](docs/MIGRATION-2.0.md); the short version:

- **Re-baseline and recalibrate.** Run 2.0 against your key pages to establish new baselines, and recalibrate any `--fail-under` thresholds against the new numbers before re-enabling CI gates.
- **Old data still loads.** Pre-2.0 JSON baselines load and diff cleanly (cross-version diffs are flagged in the report), and 1.x config files parse unchanged, including 7-key `weights` blocks.
- **JSON top-level field names are unchanged.** `overallScore`, `grade`, `categories`, and the other top-level fields keep their names; 2.0 adds optional fields (`stages`, evidence tiers) alongside.
- **The `tldr` shape changed.** `topFixes` (with `auditPoints`) replaces `quickestWins`, `expectedGain`, and `projectedScore`. Projected scores were removed because gains do not stack additively.
- **GitHub Action users should move to `@v2` deliberately.** The `@v1` tag stays on the 1.x line; switch to `@v2` when you are ready to re-baseline, and recalibrate `fail-under` at the same time.

## Compatibility Notes

**Node.js** - Requires Node 20.19 or later (the first Node 20 release with `require(esm)` support, which the CJS bin entries rely on). The `engines` field in `package.json` enforces this.

**Zod** - Uses [Zod 4](https://zod.dev). If you consume the library API and also use Zod in your project, ensure you are on Zod 4+ to avoid type incompatibilities.

**CJS bin entries** - Both `bin/aiseo-audit.js` (CLI) and `bin/aiseo-audit-mcp.js` (MCP server) use `require()` (CommonJS), which needs Node 20.19+ because some dependencies are ESM-only. The library exports support both ESM (`import`) and CJS (`require`).

**Config discovery** - When using the programmatic API, `loadConfig()` searches for config files starting from `process.cwd()`. If your application's working directory differs from where your config file lives, pass an explicit path:

```typescript
const config = await loadConfig("/path/to/aiseo.config.json");
```

## Documentation

- [Audit Breakdown](docs/AUDIT_BREAKDOWN.md) - Full scoring methodology: every factor, band, stage, and evidence tier
- [Evidence](docs/EVIDENCE.md) - Factor-to-evidence traceability: tier, stage, citations, experimental regime, and metric for every factor
- [Emerging Research](docs/EMERGING_RESEARCH.md) - Cross-paper synthesis of the peer-reviewed GEO literature, and the research maintenance policy
- [Paper Reviews](docs/paper-reviews/README.md) - Primary-source reviews of the ten peer-reviewed papers behind the 2.0 scoring model
- [Research](docs/RESEARCH.md) - The annotated historical research document from v1, kept for the record
- [Migration to 2.0](docs/MIGRATION-2.0.md) - Breaking changes, what stayed stable, and how to re-baseline
- [Future Phases](docs/FUTURE_PHASES.md) - Engine probes, repeated-measurement reporting, and the calibration study planned beyond 2.0
- [Archive](docs/archive/README.md) - Pristine v1 documentation preserved for historical comparison

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and pull request guidelines.

## Releases

Release notes are published on the [GitHub Releases](https://github.com/agencyenterprise/aiseo-audit/releases) page, and every release is recorded in [CHANGELOG.md](CHANGELOG.md).

## License

MIT

[![API](https://img.shields.io/badge/API-supported-brightgreen)](https://github.com/agencyenterprise/aiseo-audit#programmatic-api)
