# aiseo-audit

[![npm version](https://img.shields.io/npm/v/aiseo-audit.svg?color=F5B0A4)](https://www.npmjs.com/package/aiseo-audit)
[![npm downloads](https://img.shields.io/npm/dw/aiseo-audit?color=F5B0A4)](https://www.npmjs.com/package/aiseo-audit)
[![npm package size](https://img.shields.io/npm/unpacked-size/aiseo-audit?color=F5B0A4)](https://www.npmjs.com/package/aiseo-audit)
[![License: MIT](https://img.shields.io/badge/License-MIT-7EB6D7.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-7EB6D7.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-7EB6D7?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-459%20passed-8FBC8F)](https://github.com/agencyenterprise/aiseo-audit)
[![Coverage](https://img.shields.io/codecov/c/github/agencyenterprise/aiseo-audit?color=8FBC8F&label=coverage)](https://codecov.io/gh/agencyenterprise/aiseo-audit)
[![GitHub Stars](https://img.shields.io/github/stars/agencyenterprise/aiseo-audit?style=flat&color=8FBC8F)](https://github.com/agencyenterprise/aiseo-audit/stargazers)

<div align="center">
  <strong>Testing example</strong><br /><br />
  <img src="docs/assets/ai-seo-bad-site-example.gif" alt="Testing example" width="600" />
</div>

Deterministic CLI that audits web pages for **AI search readiness**. Think Lighthouse, but for how well AI engines can fetch, extract, understand, and cite your content.

**AI SEO measures how reusable your content is for generative engines, not traditional search rankings.**

**Who is this for?** Content teams running pre-publish checks, developers gating deployments in CI/CD, and marketers auditing their own or competitor pages. If your content needs to be cited (not just ranked), this tool tells you where you stand.

- [Quick Start](#quick-start)
- [CI/CD](#cicd)
- [CLI Options](#cli-options)
- [Site-Wide Auditing](#site-wide-auditing)
- [Local Development](#local-development)
- [Audit Categories](#audit-categories)
- [Programmatic API](#programmatic-api)
- [Compatibility Notes](#compatibility-notes)
- [Documentation](#documentation)

## What is AI SEO?

Traditional SEO optimizes for ranking in a list of links. **AI SEO** optimizes for being **cited** in generated answers. Different goal, different signals.

When someone asks ChatGPT, Claude, Perplexity, or Gemini a question, those engines fetch web content, extract the useful parts, and decide what to cite. AI SEO (also called Generative Engine Optimization or GEO) is the practice of structuring your content so that process works in your favor. The foundational research behind this field comes from [Princeton's GEO paper](https://arxiv.org/abs/2311.09735), which identified the specific content traits that increase generative engine citations.

aiseo-audit measures those signals: can the content be extracted? Is it structured for reuse? Does it contain the patterns AI engines actually quote? It runs entirely locally with no AI API calls and no external services.

## How aiseo-audit Is Different

Most "AI readiness" audits check whether certain files and tags exist. Does the site have llms.txt? Is there a sitemap? Is JSON-LD present? Those are binary checks that tell you very little about whether AI engines will actually use your content.

aiseo-audit goes deeper:

- **Content analysis, not just tag detection.** NLP-based entity extraction, readability scoring, answer capsule detection, section length analysis, and boilerplate measurement. 30+ factors across 7 research-backed categories.
- **Research-grounded scoring.** Thresholds and weights are derived from published research on what generative engines actually cite. See [Audit Breakdown](docs/AUDIT_BREAKDOWN.md) for the full methodology and [Research](docs/RESEARCH.md) for where the data comes from.
- **Configurable weights.** Prioritize the categories that matter to your content via `aiseo.config.json`. Zero vendor lock-in.
- **Four output formats.** Pretty terminal, JSON, Markdown, and self-contained HTML reports.
- **Zero external dependencies at runtime.** No API keys, no network calls beyond fetching the target URL. Fully deterministic.

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

## CI/CD

Drop this into any GitHub Actions workflow to gate PRs on AI search readiness:

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

| Option                 | Description                                                                       | Default                                       |
| ---------------------- | --------------------------------------------------------------------------------- | --------------------------------------------- |
| `[url]`                | URL to audit                                                                      | -                                             |
| `--sitemap <url>`      | Audit all URLs in a sitemap.xml                                                   | -                                             |
| `--signals-base <url>` | Base URL to fetch domain signals from (robots.txt, llms.txt, llms-full.txt)       | Directory of the URL or sitemap being audited |
| `--json`               | Output as JSON                                                                    | -                                             |
| `--md`                 | Output as Markdown                                                                | -                                             |
| `--html`               | Output as HTML                                                                    | -                                             |
| `--out <path>`         | Write output to a file; format is inferred from `.html`, `.md`, `.json` extension | -                                             |
| `--fail-under <n>`     | Exit with code 1 if score < threshold                                             | -                                             |
| `--timeout <ms>`       | Request timeout in ms                                                             | `45000`                                       |
| `--user-agent <ua>`    | Custom User-Agent string                                                          | `AISEOAudit/<version>`                        |
| `--config <path>`      | Path to config file                                                               | -                                             |

Either `[url]` or `--sitemap` must be provided, but not both. If no output flag is given, the default is `pretty` (color-coded terminal output). The default format can also be set in the config file.

When `--out` is provided, the format is automatically inferred from the file extension (`.html` becomes HTML, `.md` becomes Markdown, `.json` becomes JSON) so you don't need to pass a separate format flag. An explicit `--html`, `--md`, or `--json` flag takes precedence if provided.

## Site-Wide Auditing

Use `--sitemap` to audit every URL in a `sitemap.xml`. Domain signals (`robots.txt`, `llms.txt`, `llms-full.txt`) are fetched once and shared across all URL audits, not re-fetched per page.

By default, domain signals are fetched from the directory that contains the sitemap file. For example, if your sitemap is at `https://example.com/projects/sitemap.xml`, signals are fetched from `https://example.com/projects/` so the tool checks `https://example.com/projects/robots.txt`, `https://example.com/projects/llms.txt`, and `https://example.com/projects/llms-full.txt`. If your signals live at the domain root instead, use `--signals-base` to specify the correct location explicitly.

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
- **`llms.txt`** is a proposed standard that provides LLMs with a concise summary of your site's purpose, key pages, and preferred citation format.
- **`llms-full.txt`** is the extended version of `llms.txt` with more comprehensive site documentation.

When auditing over HTTP, these files are checked against your local server. If your local server serves them, they will pass. If not, they will show as missing. Keep in mind that your local and production configurations for these files may differ, so verify them separately against your production domain.

## Audit Categories

> [!NOTE]
> AI SEO (e.g. GEO: Generative Engine Optimization) is a new and developing field. Methodologies and audit criteria may evolve as research and engine behavior advance.

The audit evaluates 7 categories of AI search readiness (_[Detailed Breakdown here](docs/AUDIT_BREAKDOWN.md)_):

| Category                        | What It Measures                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| **Content Extractability**      | Can AI engines successfully fetch and extract meaningful text from the page?             |
| **Content Structure for Reuse** | Is the content organized with headings, lists, and tables that engines can segment?      |
| **Answerability**               | Does the content provide clear definitions, direct answers, and step-by-step patterns?   |
| **Entity Clarity**              | Are named entities (people, orgs, places) clearly present and consistent with the topic? |
| **Grounding Signals**           | Does the content cite external sources, include statistics, and attribute claims?        |
| **Authority Context**           | Is there author attribution, organization identity, publish dates, and structured data?  |
| **Readability for Compression** | Is the content written at a readability level that compresses well for AI summarization? |

### Interpreting Your Score

| Score  | Grade | What It Means                                                                                            |
| ------ | ----- | -------------------------------------------------------------------------------------------------------- |
| 90–100 | A     | Highly optimized. AI engines can fetch, understand, and cite your content with minimal friction.         |
| 75–89  | B     | Good foundation. A few targeted improvements will push you into the top tier.                            |
| 60–74  | C     | Moderate readiness. Structural or content gaps are likely limiting your citation potential.              |
| 40–59  | D     | Significant gaps. Core signals (structure, answerability, authority) need attention.                     |
| 0–39   | F     | Not AI-ready. Start with Content Extractability. If the content cannot be fetched, nothing else matters. |

The per-category breakdown in each report shows exactly where to focus. Start with high-priority recommendations in your lowest-scoring categories.

## Output Formats

### Pretty (default)

Color-coded terminal output with scores, factor breakdowns, and recommendations. Where available, recommendations include numbered implementation steps, a ready-to-use code example, and a learn more link. Best for quick checks during development.

### JSON

Full structured output with all scores, factor details, raw data, and recommendations. Recommendations include optional `steps`, `codeExample`, and `learnMoreUrl` fields where applicable. Best for integrations, CI/CD pipelines, and programmatic consumption.

### Markdown

Structured report with category tables, factor details, and recommendations grouped by category. Recommendations with steps render as numbered lists; code examples render as fenced code blocks. Best for documentation, PRs, and sharing.

### HTML

Self-contained single-file report with SVG score gauges, color-coded sections, and recommendations grouped by category. Recommendations with steps and code examples render as inline detail sections below each recommendation row. Best for stakeholder reports and visual review.

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
  "weights": {
    "contentExtractability": 1,
    "contentStructure": 1,
    "answerability": 1,
    "entityClarity": 1,
    "groundingSignals": 1,
    "authorityContext": 1,
    "readabilityForCompression": 1
  }
}
```

Weights are relative. Set a category to `2` to double its importance, or `0` to exclude it entirely from scoring.

**Example: tuning for a blog or editorial site.** Content that needs to be cited by AI engines should be highly answerable and readable. Double those weights and reduce the emphasis on domain-signal files (`authorityContext` covers schema markup, while `groundingSignals` covers citations and statistics):

```json
{
  "format": "html",
  "failUnder": 65,
  "weights": {
    "contentExtractability": 2,
    "contentStructure": 1,
    "answerability": 2,
    "entityClarity": 1,
    "groundingSignals": 2,
    "authorityContext": 1,
    "readabilityForCompression": 2
  }
}
```

**Example: tuning for a product or docs site.** Authority and structure matter more when content needs to be trusted and navigable:

```json
{
  "format": "html",
  "failUnder": 70,
  "weights": {
    "contentExtractability": 2,
    "contentStructure": 2,
    "answerability": 1,
    "entityClarity": 1,
    "groundingSignals": 1,
    "authorityContext": 2,
    "readabilityForCompression": 1
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
  FactorResultType,
  RecommendationType,
  ReportFormatType,
  AiseoConfigType,
} from "aiseo-audit";
```

`RecommendationType` includes the base fields (`category`, `factor`, `currentValue`, `priority`, `recommendation`) plus three optional fields populated for high-impact factors:

```typescript
type RecommendationType = {
  category: string;
  factor: string;
  currentValue: string;
  priority: "high" | "medium" | "low";
  recommendation: string;
  steps?: string[]; // ordered implementation steps
  codeExample?: string; // ready-to-use code snippet
  learnMoreUrl?: string; // link to canonical spec or docs
};
```

## Philosophy

This tool measures **AI search reusability**: how well a page's content can be fetched, extracted, understood, and reused by AI engines like ChatGPT, Claude, Perplexity, and Gemini.

It is:

- **Deterministic**: No AI API calls. Same URL produces the same score.
- **Engine-agnostic**: Not optimized for any specific AI platform.
- **Content-focused**: Analyzes what's on the page, not external signals.
- **Lightweight**: Fast CLI with minimal dependencies.

## Exit Codes

| Code | Meaning                                         |
| ---- | ----------------------------------------------- |
| `0`  | Success                                         |
| `1`  | Score below `--fail-under` threshold            |
| `2`  | Runtime error (fetch failed, invalid URL, etc.) |

## Compatibility Notes

**Node.js** - Requires Node 20 or later. The `engines` field in `package.json` enforces this. Earlier versions will produce runtime errors.

**Zod** - Uses [Zod 4](https://zod.dev). If you consume the library API and also use Zod in your project, ensure you are on Zod 4+ to avoid type incompatibilities.

**CJS bin entry** - The `bin/aiseo-audit.js` executable uses `require()` (CommonJS). This is compatible with all Node 20+ environments regardless of your project's module system. The library exports support both ESM (`import`) and CJS (`require`).

**Config discovery** - When using the programmatic API, `loadConfig()` searches for config files starting from `process.cwd()`. If your application's working directory differs from where your config file lives, pass an explicit path:

```typescript
const config = await loadConfig("/path/to/aiseo.config.json");
```

## Documentation

- [Audit Breakdown](docs/AUDIT_BREAKDOWN.md) - Full scoring methodology, every factor, every threshold, with research citations
- [Research](docs/RESEARCH.md) - Sources and gap analysis

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and pull request guidelines.

## Releases

Release notes are published on the [GitHub Releases](https://github.com/agencyenterprise/aiseo-audit/releases) page. A separate `CHANGELOG.md` is not maintained.

## License

MIT

[![API](https://img.shields.io/badge/API-supported-brightgreen)](https://github.com/agencyenterprise/aiseo-audit#programmatic-api)
