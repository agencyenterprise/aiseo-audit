# Migrating from 1.x to 2.0

## Why 2.0 exists

Between August 2025 and August 2026, ten peer-reviewed papers re-tested the assumptions
1.x scoring was built on. Several 1.x behaviors turned out to be contradicted by controlled
experiments: formatting counts were causally null, keyword density measurably hurt, a visible
stale date scored above no date when the evidence says the opposite, and factor points were
summed as if gains stack when they measurably do not. 2.0 rebuilds the scoring model around
that evidence. The full review series lives in [paper-reviews/](paper-reviews/), the synthesis
in [EMERGING_RESEARCH.md](EMERGING_RESEARCH.md), and the per-factor evidence map in
[EVIDENCE.md](EVIDENCE.md). The 1.x docs are preserved verbatim in [archive/v1/](archive/v1/).

## The one-sentence version

Re-baseline: scores shift wholesale between 1.x and 2.0 with no mapping formula, so recalibrate
any `--fail-under` threshold against fresh 2.0 runs before trusting the gate.

## Breaking changes

| Change                                                                                                                                                                                                                                                                          | What to do                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Scores shift wholesale. Denominators now exclude neutral and diagnostic factors, eleven factors no longer score, new factors score, and technical-eligibility failure caps the score at 25 (grade F).                                                                           | Run 2.0 on your pages, record new baselines, set `failUnder` against 2.0 numbers.            |
| Eleven 1.x factors are now unscored diagnostics (status `info`, 0/0 points): Lists Presence, Tables Presence, Paragraph Structure, Scannability, Section Length, Answer Capsules, Q/A Patterns, Word Count Adequacy, LLMs.txt Presence, Image Accessibility, Transition Usage.  | Anything keying on those factors' scores should read their `value` strings instead.          |
| Two factors renamed: `Entity Density` is replaced by `Term Repetition Balance` (inverse-only: repetition is penalized, never rewarded); `Publication Date` is now the `Date Markup` diagnostic.                                                                                 | Update any tooling matching factor names.                                                    |
| Freshness logic inverted to match the evidence: scored only on time-sensitive topics; recent earns full points, no date is neutral, a visibly stale date scores zero and trips an evidence gate. A dated 2019 page no longer outscores an undated one.                          | Do not add dates you will not maintain.                                                      |
| The TLDR shape changed: `topFixes[{factor, category, auditPoints}]` and a non-additive `note` replace `quickestWins[].expectedGain`, `projectedScore`, and `projectedGrade` (projections implied additive gains, which stacking experiments refuted).                           | Update consumers of `tldr`; the GitHub Action's PR comment is already updated on the v2 tag. |
| `Recommendation.expectedGain` renamed to `auditPoints` (internal audit weights, not predicted citation gains). Recommendations may now merge into a single "Direction conflict" item when advice pulls opposite ways, and style advice is suppressed on already-polished pages. | Update JSON consumers reading `expectedGain`.                                                |
| Recommendation copy rewritten; unsupported claims removed (the 30-40% quotation figure, 72% capsule figure, 65% freshness figure, 3x structured-content figure).                                                                                                                | Anything matching recommendation text will need updating.                                    |
| Reports show the top 3 recommendations; the full list remains in `--json` output.                                                                                                                                                                                               | Use JSON for the complete list.                                                              |

## What did NOT change

- JSON top-level field names: `overallScore`, `grade`, `totalPoints`, `maxPoints`, `categories`,
  `recommendations`, `rawData`, and sitemap `averageScore`/`averageGrade` all survive.
- Exit codes (0 pass, 1 fail-under, 2 usage/runtime error).
- GitHub Action inputs and outputs (`score`, `grade`, `report-path`).
- The MCP tool name (`audit_url`) and its raw-result JSON output.
- Config compatibility: 1.x `aiseo.config.json` files parse unchanged; new fields are optional.
- Old result JSONs: 1.x baselines still load for `--diff` and `--baseline`. Cross-version diffs
  are flagged (`crossVersion: true`) and stage scores are recomputed for the old side, so deltas
  are indicative rather than exact.

## What is new

- Pipeline-stage scores: `stages.technicalEligibility` (pass/fail gate with blockers),
  `stages.retrievalAlignment`, `stages.citationFitness` (with evidence gates that cap the stage),
  `stages.provenance`.
- Evidence tiers and paper citations on every factor (`evidence`, `citations`), mapped in
  [EVIDENCE.md](EVIDENCE.md).
- Target queries: repeatable `--query` (about 5 recommended, max 10) or config `queries`,
  scored by the worst-covered query, with per-query detail in `rawData.queryAlignment`.
- Domain profiles: `--domain auto|product|informational`; product pages gain the Product Fit
  category (price, specs, comparisons) and a warning that generic optimization measurably hurt
  product pages in end-to-end tests.
- Experimental engine presets: `--engine gemini|gpt|perplexity` (weight overlays, clearly
  labeled experimental).
- `schemaVersion: 2` on every result.

## GitHub Action

`@v1` stays pinned to the 1.x line (its default `version` input was pinned to major 1 in the
final 1.x release). Move to `@v2` deliberately, and recalibrate `fail-under` when you do.

## 1.x deprecation

1.x versions will be marked with `npm deprecate` after 2.0 ships, pointing here. 1.x is not
broken software; it is superseded by scoring aligned with newer peer-reviewed evidence.
