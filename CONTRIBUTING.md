# Contributing to GEO Audit

Thank you for your interest in contributing to GEO Audit.

## Development Setup

```bash
git clone https://github.com/agencyenterprise/geoaudit.git
cd geoaudit
npm install
```

## Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `npm run build`      | Build with tsup (CJS + ESM)    |
| `npm test`           | Run tests once                 |
| `npm run test:watch` | Run tests in watch mode        |
| `npm run lint`       | Type-check with `tsc --noEmit` |

## Project Structure

```
src/
├── cli.ts                  # CLI entry point
├── index.ts                # Library entry point
├── modules/
│   ├── analyzer/           # Orchestrates the audit pipeline
│   ├── audits/             # Audit orchestrator, categories/, scoring helpers
│   ├── config/             # Config loading and schema
│   ├── extractor/          # HTML parsing and content extraction
│   ├── fetcher/            # HTTP fetching
│   ├── recommendations/    # Recommendation generation
│   ├── report/             # Report rendering (pretty, json, md, html)
│   └── scoring/            # Score computation and grading
└── utils/                  # Shared utilities (fs, http, strings, url)
```

Each module follows a consistent pattern:

- `schema.ts` - Zod schemas and TypeScript types
- `service.ts` - Core logic
- `constants.ts` - Static values (where needed)
- `support/` - Helper functions (where needed)

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
