# Contributing to aiseo-audit

Thank you for your interest in contributing to aiseo-audit.

## Development Setup

```bash
git clone https://github.com/agencyenterprise/aiseo-audit.git
cd aiseo-audit
npm install
```

## Scripts

| Command                 | Description                    |
| ----------------------- | ------------------------------ |
| `npm run build`         | Build with tsup (CJS + ESM)    |
| `npm test`              | Run tests once                 |
| `npm run test:watch`    | Run tests in watch mode        |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint`          | Type-check with `tsc --noEmit` |

## Project Structure

```
src/
├── cli.ts                  # CLI entry shim (aiseo-audit bin)
├── cli/program.ts          # CLI logic: flags, validation, exit codes (testable)
├── index.ts                # Library entry point
├── mcp.ts                  # MCP server bootstrap (aiseo-audit-mcp bin)
├── mcp/                    # MCP tool definitions and handlers
├── version.ts              # Package version (injected at build time)
├── modules/
│   ├── analyzer/           # Orchestrates the audit pipeline
│   ├── audits/             # Audit orchestrator, factor-name registry, category assembly
│   ├── answerability/      # Category audit: definitions, capsules, Q/A patterns
│   ├── authority-context/  # Category audit: author, org, dates, JSON-LD
│   ├── content-extractability/  # Category audit: fetch, extraction, robots.txt
│   ├── content-structure/  # Category audit: headings, lists, sections
│   ├── entity-clarity/     # Category audit: named entities, topics
│   ├── grounding-signals/  # Category audit: citations, statistics, attribution
│   ├── readability/        # Category audit: sentence length, Flesch, transitions
│   ├── config/             # Config loading and schema
│   ├── diff/               # Score diffing, audit history, and --diff orchestration
│   ├── extractor/          # HTML parsing and content extraction
│   ├── fetcher/            # HTTP fetching
│   ├── nlp/                # NLP utilities (entity extraction, readability, topics)
│   ├── recommendations/    # Recommendation generation
│   ├── report/             # Report rendering (pretty, json, md, html) + shared view-model
│   ├── scoring/            # All scoring logic (thresholds, factors, grades)
│   └── sitemap/            # Sitemap fetching, parsing, and batch auditing
└── utils/                  # Shared utilities (fs, http, strings, url)
```

Each module follows a consistent pattern:

- `schema.ts` - Contract types; Zod schemas where data is parsed at runtime
- `service.ts` or `index.ts` - Core logic
- `constants.ts` - Thresholds and display names (where needed)
- `examples.ts` - Static code examples for recommendation output (where needed)
- `support/` - Helper functions (where needed)

Adding a factor touches three places, and the compiler walks you through them: register the display name in `src/modules/audits/factor-names.ts`, score it in its category module via `makeFactor`, and add its builder to `RECOMMENDATION_BUILDERS` (a missing builder is a type error). Adding a category is: create the module, add its key to `CategoryNameSchema`, and wire it in `audits/service.ts`; weights and TLDR projections derive from the schema automatically.

## How to Contribute

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run `npm test` and `npm run lint` to verify
5. Open a pull request against `main`

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include tests for new functionality
- Run the full test suite before submitting
- Describe what your PR does and why

## Research and Scoring

The audit scoring is research-backed. Before proposing changes to scoring thresholds or adding new audit factors, review:

- [Audit Breakdown](docs/AUDIT_BREAKDOWN.md) - Detailed scoring methodology
- [Research](docs/RESEARCH.md) - Research sources and gap analysis

## Code Style

- TypeScript with strict mode
- Formatting enforced by Prettier (see `.prettierrc`)
- Type checking via `tsc --noEmit`
- No comments to explain what code does -- write code that explains itself

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
