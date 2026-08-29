# Changelog

All notable changes to this project are documented in this file, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Releases before 2.0.0
are documented on [GitHub Releases](https://github.com/agencyenterprise/aiseo-audit/releases).

## [2.0.0] - Unreleased

A research-driven rescoring. Ten peer-reviewed papers (2025-2026) were reviewed from primary
sources ([docs/paper-reviews/](docs/paper-reviews/)); 2.0 aligns the tool's measurements,
scoring semantics, and claims with that evidence. Scores are not comparable to 1.x:
see [docs/MIGRATION-2.0.md](docs/MIGRATION-2.0.md).

### Added

- Pipeline-stage scores: technical eligibility (pass/fail gate), retrieval alignment,
  citation fitness (with evidence gates that cap the stage), provenance.
- Evidence tiers (`supported`/`conditional`/`heuristic`/`diagnostic`/`experimental`) and
  paper citations on every factor; the full map lives in [docs/EVIDENCE.md](docs/EVIDENCE.md).
- Structural Alignment category: coverage of the body's key entities, terms, and figures in
  the title, meta description, headings, and JSON-LD (the strongest end-to-end retrieval
  evidence in the literature).
- Target queries: repeatable `--query` / config `queries` with worst-case-query scoring,
  per-query coverage detail, and an off-topic evidence gate.
- Domain profiles (`--domain`, auto-detected by default): product pages gain the Product Fit
  category (price gatekeeper, technical specifications, comparison content) and an
  evidence-backed warning; informational pages gain Explanatory Depth.
- New scored factors: Lead Summary, Hedged Language, Paywall Signals, Term Repetition Balance.
- New unscored diagnostics: Promotional Language, Affiliate Link Density, Ad Slot Markers,
  Site Type, Topic Time Sensitivity, Pronoun Ambiguity, Date Markup.
- Experimental engine weight presets: `--engine gemini|gpt|perplexity`.
- Recommendations engine: evidence and citations on every item, opposite-direction advice
  merged into a single conflict item, style advice suppressed on already-polished pages,
  fidelity notes on evidence-adding advice, non-additive framing (`auditPoints`).
- Diff v2: stage deltas, per-query regression flags, cross-version baseline support
  (1.x result JSONs still load and diff).
- `schemaVersion: 2` on results; MCP tool accepts `queries` and `domain`.
- Dependencies: `hedges`, `dice-coefficient`, `okapibm25`, `syllable`.

### Changed

- Neutral and diagnostic factors no longer count in category denominators (1.x penalized
  pages for inapplicable factors).
- Freshness now applies only to time-sensitive topics with the evidence-consistent ordering:
  recent scores fully, no date is neutral, a visibly stale date scores zero.
- Readability factors score against floors instead of bands (fluency polishing of already
  readable pages measurably reduced visibility).
- Failing technical eligibility caps the overall score at 25 (grade F).
- Reports render stage scores, tier badges, grouped diagnostics, and the top 3
  recommendations (full list in JSON).
- TLDR reworked: `topFixes` with `auditPoints` and a non-additive note.
- All recommendation copy rewritten to match the evidence; docs reframed as a
  research-informed heuristic audit.

### Removed

- Scoring for formatting-count factors (lists, tables, paragraph bands, scannability,
  section length), question-heading counts, answer-capsule character rule, word-count bands,
  llms.txt presence, image accessibility, and transition words: all remain visible as
  unscored diagnostics.
- `Entity Density` (replaced by the inverse-only `Term Repetition Balance`).
- `tldr.projectedScore`/`projectedGrade`/`quickestWins` and `Recommendation.expectedGain`
  (additive-gain framing was experimentally refuted).
- Unsupported research claims from all output strings (30-40% quotation lift, 72% answer
  capsules, 65% freshness, 3x structured content).

### Deprecated

- 1.x releases will be marked deprecated on npm after 2.0.0 ships, pointing at the
  migration guide.
