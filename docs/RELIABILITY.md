# Reliable audits and integrations

These features are available in the next release after 2.0.2. The scoring model
identifier is `2.1`; the JSON report schema remains backward readable as version 2.
Re-baseline before enforcing scores from this model against a 2.0.x report.

## Changes that affect existing scores

- Robots rules are evaluated against the final page path and query string after
  redirects. A blocked section can fail eligibility even when `/` is allowed.
- Failed or unavailable robots responses produce unknown, unscored crawler access.
  A 404 or 410 means the file is absent; a successfully fetched empty file has no
  restrictions. Neither is treated as a failed request.
- Freshness uses an explicit UTC evaluation date, including UTC month arithmetic.
- English-dependent checks are excluded for unsupported or unknown languages.
  These partial scores must not be compared with full English audits.
- Recommendation ordering considers eligibility blockers first, evidence strength
  next, and then missing audit points multiplied by the applicable category or
  stage weight. Zero-weight categories do not generate recommendations, except
  for eligibility blockers. These weights do not predict citation gains.

## Analyze content before publishing

```ts
import { analyzeHtml, renderReport } from "aiseo-audit";

const result = analyzeHtml(
  {
    html: "<html lang='en'><body><main>Page content</main></body></html>",
    url: "https://example.com/guide",
    evaluationDate: "2026-10-12",
  },
  { queries: ["backup retention"] },
);
console.log(renderReport(result, { format: "json" }));
```

`analyzeHtml` is synchronous and makes no network requests. The second argument is
optional and accepts the same configuration fields as the config file, with defaults
applied. The supplied URL identifies the document and resolves its site context; it
is not fetched. Optional `headers` support Content-Language, and `domainSignals` let
an integrator supply previously captured robots and llms observations. Fetch success
is unscored for supplied HTML. Reports state which network checks were not performed.

```bash
npx aiseo-audit --file ./dist/guide.html --url https://example.com/guide
cat ./dist/guide.html | npx aiseo-audit --stdin --url https://example.com/guide --json
```

File and stdin inputs have a 10 MB limit. Client-rendered HTML can be supplied by a
browser adapter, but the core package does not execute JavaScript or launch a browser.

## Record and replay an audit

```bash
npx aiseo-audit https://example.com/guide \
  --evaluation-date 2026-10-12 --snapshot-out inputs.json --out baseline.json
npx aiseo-audit --replay inputs.json --out replay.json
```

The snapshot contains the fetched HTML, final URL, response metadata, domain signals,
configuration, scoring version, and evaluation date. `captureUrl(options, config?)`
and `analyzeSnapshot(snapshot)` provide the same workflow in code. Replay is offline
and rejects an incompatible scoring version. It cannot override the snapshot's
configuration or date. Keep snapshots where the captured page content may be stored;
they contain raw inputs, not only summary scores.

The report records:

| Field                           | Meaning                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `meta.scoringVersion`           | Scoring model identifier, separate from the report schema          |
| `meta.evaluationDate`           | UTC date used for age-dependent rules                              |
| `meta.configurationFingerprint` | SHA-256 of effective scoring settings                              |
| `meta.inputFingerprint`         | SHA-256 of captured content, response metadata, and domain signals |
| `meta.effectiveWeights`         | Category weights after the engine preset                           |
| `meta.source`                   | `network` or supplied `html`                                       |
| `meta.finalUrl`                 | URL used for extraction and crawler access after redirects         |

Identical captured inputs, scoring model, configuration, and evaluation date produce
the same scores. Execution duration and `analyzedAt` reflect the current run and need
not match. A newer evaluation date intentionally allows the same content to age.

## Read actionable findings

Every report includes `findings`, a versioned array with stable `ruleId` values,
fingerprints, category, pipeline stage, evidence tier, measured value, applicability,
expected good-status threshold, remediation, and source location.

`location.scope` is `element`, `document`, or `network`. An element location includes
a CSS selector and a whitespace-normalized excerpt of up to 320 characters. Document-
wide and missing-evidence findings do not invent an offending passage. The HTML report
highlights available excerpts as escaped text, never as executable page HTML.

A finding fingerprint identifies a rule on a page across edits. It is distinct from
the input fingerprint, which identifies the captured inputs. `diff.findingChanges`
lists introduced, resolved, and persisting warning/error rule IDs when both reports
include findings. Consumers should use IDs rather than human-readable factor names.

The `expected.minimumScore` field is the existing factor threshold for a `good`
status (70% of that factor's maximum points). It is not a content-quality guarantee.
The JSON findings remain inspectable even when recommendation filtering suppresses
an unnecessary edit. HTML, Markdown, and terminal recommendations show available
locations; JSON includes all findings.

## Enforce meaningful CI checks

```bash
npx aiseo-audit --file ./dist/guide.html --url https://example.com/guide \
  --baseline ./baselines/guide.json --fail-on-regression --out report.json

npx aiseo-audit https://example.com/guide \
  --baseline ./baselines/guide.json --fail-on-new-blocker
```

`--fail-on-regression` fails on a lower overall score, an existing query's coverage
regression, or a new eligibility blocker. `--fail-on-new-blocker` ignores score-only
changes. Both require an existing baseline and a comparable configuration.

Changed page identity, scoring model, report schema, source mode, signals source,
language coverage, weights, queries, domain profile, or engine make results
incomparable. Reports explain why; regression gates exit with code 2 rather than
passing an invalid comparison. Older reports without sufficient configuration metadata
remain readable but cannot establish comparability. A changed evaluation date produces
a warning because aging can affect the score. Freeze `--evaluation-date` when CI
should isolate content edits from aging. Numeric deltas remain available for inspection.

The GitHub Action exposes `file`, `baseline`, `fail-on-regression`,
`fail-on-new-blocker`, `evaluation-date`, `failed-pages`, `max-urls`, and `concurrency`.
Use a release containing these inputs, and preserve baseline reports as repository
files or workflow artifacts. Score changes never authorize editing or publishing content.

## Bound site-wide work

```bash
npx aiseo-audit --sitemap https://example.com/sitemap.xml \
  --max-urls 100 --concurrency 4 --progress --out site.json
```

- Concurrency defaults to 1 and accepts 1 through 16. Output order follows sitemap order.
- `--max-urls` limits unique discovered page URLs and stops further child sitemap traversal
  after reaching the limit. The report warns when the configured limit is reached.
- Domain signals are cached per final origin, or per explicit `--signals-base` override.
- Progress goes to stderr, keeping JSON on stdout valid.
- `Ctrl-C` cancels requests and stops scheduling pages; the CLI exits with code 130.
- Library callers can pass an `AbortSignal` to `analyzeUrl`, `captureUrl`, or
  `analyzeSitemap`. Sitemap callers can also supply `onProgress({ completed, total, result })`.
- Failed pages or incomplete child sitemaps cause CLI exit code 2 by default, even
  when successful pages have a high average. `--failed-pages ignore` explicitly
  permits partial coverage. An audit with no successful pages always exits with code 2.
- Network exceptions count as failed pages. HTTP error responses that can be read are
  audited as failed eligibility and remain part of the score average.

Exit code 0 means the audit and requested gates passed; 1 means a quality gate failed;
2 means invalid usage, incomparable baselines, or an incomplete/failed audit.

## Language support and benchmark limits

Language comes from `<html lang>`, then Content-Language, then a conservative English
stopword heuristic. Unrecognized text is marked unknown. Only English text checks
are supported; a declaration is an input signal, not proof that a mixed-language page
is supported. Unknown and unsupported languages exclude English-dependent scoring
and query mismatch gates, preserve applicable structural checks, and show a partial-
score warning. The package does not claim multilingual semantic analysis.

Run `npm run benchmark` for the public, MIT-licensed synthetic corpus in
[benchmarks](../benchmarks/README.md). It reports annotated finding precision/recall
and applicability matches. This is a small regression benchmark, not a validation of
citation outcomes, a representative language evaluation, or a fitted scoring model.
