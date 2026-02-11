# generative-engine-audit-cli

Deterministic CLI that audits web pages for **generative engine readiness**. Think Lighthouse, but for how well LLMs and generative AI engines can fetch, extract, understand, and reuse your content.

**GEO measures generative reusability, not traditional search rankings.**

## Install

```bash
npm install -g generative-engine-audit-cli
```

Or use directly with npx:

```bash
npx generative-engine-audit-cli https://example.com
```

## Usage

```bash
# Pretty terminal output (default)
geoaudit https://example.com

# JSON output
geoaudit https://example.com --json

# Markdown output
geoaudit https://example.com --format md

# Write JSON to file
geoaudit https://example.com --out report.json

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

| Option | Description | Default |
|--------|-------------|---------|
| `<url>` | URL to audit (required) | - |
| `--json` | Output as JSON | `false` |
| `--format <fmt>` | Output format: `pretty`, `json`, `md` | `pretty` |
| `--out <path>` | Write JSON results to file | - |
| `--fail-under <n>` | Exit code 1 if score < threshold | - |
| `--timeout <ms>` | Request timeout in ms | `45000` |
| `--user-agent <ua>` | Custom User-Agent string | `GEOAudit/0.1.0` |
| `--config <path>` | Path to `geo.json` config file | - |

## Audit Categories

The audit evaluates 7 categories of generative engine readiness:

| Category | What It Measures |
|----------|-----------------|
| **Content Extractability** | Can generative engines successfully fetch and extract meaningful text from the page? |
| **Content Structure for Reuse** | Is the content organized with headings, lists, and tables that engines can segment? |
| **Answerability** | Does the content provide clear definitions, direct answers, and step-by-step patterns? |
| **Entity Clarity** | Are named entities (people, orgs, places) clearly present and consistent with the topic? |
| **Grounding Signals** | Does the content cite external sources, include statistics, and attribute claims? |
| **Authority Context** | Is there author attribution, organization identity, publish dates, and structured data? |
| **Readability for Compression** | Is the content written at a readability level that compresses well for AI summarization? |

## Output Schema (JSON)

```json
{
  "url": "https://example.com",
  "analyzedAt": "2026-01-01T00:00:00.000Z",
  "overallScore": 72,
  "grade": "B-",
  "totalPoints": 302,
  "maxPoints": 420,
  "categories": {
    "contentExtractability": {
      "name": "Content Extractability",
      "key": "contentExtractability",
      "score": 50,
      "maxScore": 60,
      "factors": [
        {
          "name": "Fetch Success",
          "score": 15,
          "maxScore": 15,
          "value": "HTTP 200 in 120ms",
          "status": "good"
        }
      ]
    }
  },
  "recommendations": [
    {
      "category": "Authority Context",
      "factor": "Author Attribution",
      "currentValue": "Not found",
      "priority": "high",
      "recommendation": "Add visible author information..."
    }
  ],
  "rawData": {
    "title": "Example Page",
    "wordCount": 1200,
    "entities": {
      "people": [],
      "organizations": [],
      "places": [],
      "topics": ["example"]
    }
  },
  "meta": {
    "version": "0.1.0",
    "analysisDurationMs": 450
  }
}
```

## Config File (`geo.json`)

Create a `geo.json` in your project root to customize behavior:

```json
{
  "timeout": 45000,
  "userAgent": "GEOAudit/0.1.0",
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

Weights are relative - set a category to `2` to double its importance, or `0` to exclude it.

## Programmatic API

```typescript
import { analyzeUrl, loadConfig, renderReport } from 'generative-engine-audit-cli';

const config = await loadConfig();
const result = await analyzeUrl(
  { url: 'https://example.com', timeout: 45000, userAgent: 'MyApp/1.0' },
  config
);

console.log(result.overallScore); // 72
console.log(result.grade);       // "B-"

// Render as markdown
const md = renderReport(result, { format: 'md' });
```

## Philosophy

This tool measures **generative reusability** - how well a page's content can be fetched, extracted, understood, and reused by generative AI engines like ChatGPT, Claude, Perplexity, and Gemini.

It is:
- **Deterministic** - No AI API calls. Same URL produces the same score.
- **Engine-agnostic** - Not optimized for any specific AI platform.
- **Content-focused** - Analyzes what's on the page, not external signals.
- **Lightweight** - Fast CLI with minimal dependencies.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Score below `--fail-under` threshold |
| `2` | Runtime error (fetch failed, invalid URL, etc.) |

## License

MIT
