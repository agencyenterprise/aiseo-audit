# geoaudit

Deterministic CLI that audits web pages for **generative engine readiness**. Think Lighthouse, but for how well LLMs and generative AI engines can fetch, extract, understand, and reuse your content.

**GEO measures generative reusability, not traditional search rankings.**

## Install

```bash
npm install -g geoaudit
```

Or use directly with npx:

```bash
npx geoaudit https://example.com
```

## Usage

```bash
# Pretty terminal output (default)
geoaudit https://example.com

# JSON output
geoaudit https://example.com --json

# Markdown output
geoaudit https://example.com --md

# HTML report (Lighthouse-style)
geoaudit https://example.com --html

# Write output to a file (uses the selected format)
geoaudit https://example.com --html --out report.html
geoaudit https://example.com --md --out report.md
geoaudit https://example.com --json --out report.json

# CI/CD: fail if score below threshold
geoaudit https://example.com --fail-under 70

# Custom timeout
geoaudit https://example.com --timeout 30000

# Custom user agent
geoaudit https://example.com --user-agent "MyBot/1.0"

# Use config file
geoaudit https://example.com --config geo.json
```

## CLI Options

| Option              | Description                           | Default              |
| ------------------- | ------------------------------------- | -------------------- |
| `<url>`             | URL to audit (required)               | -                    |
| `--json`            | Output as JSON                        | -                    |
| `--md`              | Output as Markdown                    | -                    |
| `--html`            | Output as HTML                        | -                    |
| `--out <path>`      | Write rendered output to a file       | -                    |
| `--fail-under <n>`  | Exit with code 1 if score < threshold | -                    |
| `--timeout <ms>`    | Request timeout in ms                 | `45000`              |
| `--user-agent <ua>` | Custom User-Agent string              | `GEOAudit/<version>` |
| `--config <path>`   | Path to config file                   | -                    |

If no output flag is given, the default is `pretty` (color-coded terminal output). The default format can also be set in the config file.

## User Agent

By default, all HTTP requests (page fetch, `robots.txt`, `llms.txt`) are sent with the header `User-Agent: GEOAudit/<version>`. This is intentional. If a site blocks unknown bots, that is a meaningful negative signal for generative engine readiness, and the audit should surface it as a failing "Fetch Success" score.

The `--user-agent` flag exists as an escape hatch for cases where you want to bypass bot detection and test the content independently of access policy. It does not change the audit logic, only what the server sees in the request header.

## Audit Categories

The audit evaluates 7 categories of generative engine readiness:

| Category                        | What It Measures                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| **Content Extractability**      | Can generative engines successfully fetch and extract meaningful text from the page?     |
| **Content Structure for Reuse** | Is the content organized with headings, lists, and tables that engines can segment?      |
| **Answerability**               | Does the content provide clear definitions, direct answers, and step-by-step patterns?   |
| **Entity Clarity**              | Are named entities (people, orgs, places) clearly present and consistent with the topic? |
| **Grounding Signals**           | Does the content cite external sources, include statistics, and attribute claims?        |
| **Authority Context**           | Is there author attribution, organization identity, publish dates, and structured data?  |
| **Readability for Compression** | Is the content written at a readability level that compresses well for AI summarization? |

## Output Formats

### Pretty (default)

Color-coded terminal output with scores, factor breakdowns, and top recommendations. Best for quick checks during development.

### JSON

Full structured output with all scores, factor details, raw data, and recommendations. Best for integrations, CI/CD pipelines, and programmatic consumption.

### Markdown

Structured report with category tables, factor details, and recommendations grouped by category. Best for documentation, PRs, and sharing.

### HTML

Self-contained single-file report with SVG score gauges, color-coded sections, and recommendations grouped by category. Best for stakeholder reports and visual review.

## Config File

Create a config file in your project root to customize behavior. The CLI automatically discovers your config by searching from the current directory up to the filesystem root, looking for (in order):

- `geo.json`
- `.geo.json`
- `geo.config.json`

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

Weights are relative. Set a category to `2` to double its importance, or `0` to exclude it.

## Programmatic API

```typescript
import { analyzeUrl, loadConfig, renderReport } from "geoaudit";

const config = await loadConfig();
const result = await analyzeUrl(
  { url: "https://example.com", timeout: 45000, userAgent: "MyApp/1.0" },
  config,
);

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
  GeoJsonConfigType,
} from "geoaudit";
```

## Philosophy

This tool measures **generative reusability**: how well a page's content can be fetched, extracted, understood, and reused by generative AI engines like ChatGPT, Claude, Perplexity, and Gemini.

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

**Node.js** -- Requires Node 20 or later. The `engines` field in `package.json` enforces this. Earlier versions will produce runtime errors.

**Zod** -- Uses [Zod 4](https://zod.dev). If you consume the library API and also use Zod in your project, ensure you are on Zod 4+ to avoid type incompatibilities.

**CJS bin entry** -- The `bin/geoaudit.js` executable uses `require()` (CommonJS). This is compatible with all Node 20+ environments regardless of your project's module system. The library exports support both ESM (`import`) and CJS (`require`).

**Config discovery** -- When using the programmatic API, `loadConfig()` searches for config files starting from `process.cwd()`. If your application's working directory differs from where your config file lives, pass an explicit path:

```typescript
const config = await loadConfig("/path/to/geo.json");
```

## License

MIT
