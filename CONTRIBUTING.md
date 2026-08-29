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
│   ├── audits/             # Audit orchestrator, factor-name registry, FACTOR_REGISTRY (stage.ts), category assembly
│   ├── answerability/      # Category audit: lead summary, definitions, direct answers, steps
│   ├── authority-context/  # Category audit: author, org, freshness, JSON-LD, commercial-intent diagnostics
│   ├── content-extractability/  # Category audit: fetch, extraction, robots.txt, paywall signals
│   ├── content-structure/  # Category audit: heading hierarchy + formatting diagnostics
│   ├── domain-profile/     # Domain detection (product vs informational)
│   ├── entity-clarity/     # Category audit: named entities, topics, term repetition balance
│   ├── grounding-signals/  # Category audit: citations, statistics, attribution, hedged language
│   ├── product-fit/        # Conditional category audit: price, specs, comparisons (product pages)
│   ├── query-alignment/    # Conditional category audit: per-query term and aspect coverage
│   ├── readability/        # Category audit: floor-based sentence length, Flesch, jargon density
│   ├── structural-alignment/  # Category audit: salient terms in title, meta, headings, JSON-LD
│   ├── config/             # Config loading, schema, engine presets
│   ├── diff/               # Score diffing, audit history, and --diff orchestration
│   ├── extractor/          # HTML parsing and content extraction
│   ├── fetcher/            # HTTP fetching
│   ├── nlp/                # NLP utilities (entity extraction, salience, readability, topics)
│   ├── recommendations/    # Recommendation generation
│   ├── report/             # Report rendering (pretty, json, md, html) + shared view-model
│   ├── scoring/            # All scoring logic (thresholds, factors, grades, stage rollups, gates)
│   └── sitemap/            # Sitemap fetching, parsing, host profile, and batch auditing
└── utils/                  # Shared utilities (fs, http, strings, url)
```

Each module follows a consistent pattern:

- `schema.ts` - Contract types; Zod schemas where data is parsed at runtime
- `service.ts` or `index.ts` - Core logic
- `constants.ts` - Thresholds and display names (where needed)
- `examples.ts` - Static code examples for recommendation output (where needed)
- `support/` - Helper functions (where needed)

Adding a factor touches five places, and the compiler walks you through the code-side four:

1. Register the display name in `src/modules/audits/factor-names.ts`.
2. Add a `FACTOR_REGISTRY` entry in `src/modules/audits/stage.ts` with the factor's pipeline stage, evidence tier, and paper-review citation slugs (the file names under `docs/paper-reviews/`).
3. Score it in its category module via `makeFactor`, or report it unscored via `makeDiagnostic` if the evidence is null or observational-only.
4. Add its builder to `RECOMMENDATION_BUILDERS` in `src/modules/recommendations/constants.ts` (a missing builder is a type error).
5. Add a row to [docs/EVIDENCE.md](docs/EVIDENCE.md) with the same tier, stage, citations, experimental regime, and metric.

Two rules are non-negotiable. Any threshold or weight that no paper validates must carry the `heuristic` tier (or `diagnostic`/`experimental` when it should not be scored at all); nothing ships labeled better than its evidence. And every new factor needs a citation to a review under `docs/paper-reviews/`; if the supporting paper is not reviewed yet, add the review first, following the Research Maintenance Policy in [docs/EMERGING_RESEARCH.md](docs/EMERGING_RESEARCH.md#research-maintenance-policy).

Adding a category is: create the module, add its key to `CategoryNameSchema`, and wire it in `audits/service.ts`; weights derive from the schema automatically.

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

The audit scoring is a research-informed heuristic: factors carry evidence tiers mapped to peer-reviewed findings, and weights are expert-set heuristics, openly labeled as such. Before proposing changes to scoring thresholds or adding new audit factors, review:

- [Evidence](docs/EVIDENCE.md) - The factor-to-evidence table every scored factor must have a row in
- [Emerging Research](docs/EMERGING_RESEARCH.md) - Cross-paper synthesis and the Research Maintenance Policy for adding new papers
- [Paper Reviews](docs/paper-reviews/README.md) - Primary-source reviews of the peer-reviewed papers the scoring is built on
- [Audit Breakdown](docs/AUDIT_BREAKDOWN.md) - Detailed scoring methodology

## Code Style

- TypeScript with strict mode
- Formatting enforced by Prettier (see `.prettierrc`)
- Type checking via `tsc --noEmit`
- No comments to explain what code does -- write code that explains itself

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
