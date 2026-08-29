# aiseo-audit 2.0 Plan

## Context

`aiseo-audit` v1.6.2 is a deterministic, keyless AI-SEO page auditor: 7 categories, 39 factors
(462 max pts), fixed thresholds, one weighted-average 0-100 score, recommendations sorted by
per-factor point gain. Its scoring and docs rest on the 2024 Princeton GEO paper's claims.

Ten peer-reviewed papers (Aug 2025 to Aug 2026) were reviewed from primary sources in
`docs/paper-reviews/` (on this branch). In aggregate: the GEO heuristics our scoring encodes are
null or harmful across 6 benchmarks; formatting is causally null; additive scoring is
experimentally refuted (4 best heuristics stacked = 1.90x, not additive); pipeline stage matters
(structural fields drive retrieval +22%, body drives citation, rank-10-to-11 cliff); query
term/aspect coverage is the validated target (OR 6-40 causal); several v1 behaviors are inverted
vs evidence (stale-date beats no-date, density-as-positive, monotonic readability, neutral factors
inflating denominators); and a single score must not be presented as citation probability
(9-27% engine decision flips at temp 0). New checks with evidence: lead summary (3 papers),
hedged language, promotional/commercial-intent signals (3 papers incl. a production rubric),
paywall, price/specs/comparisons for product pages.

**Goal:** ship 2.0.0 as one breaking major release that makes measurements, scoring semantics,
inputs, recommendations, and claims match the evidence, while staying deterministic and keyless.

## Scope decisions (from user)

1. **Straight to 2.0**; older versions get `npm deprecate` pointing at the research-driven update.
2. **Purely static in 2.0**; probe layer and other engine-calling ideas go to `docs/FUTURE_PHASES.md`.
3. **Superset evolution**: keep the module architecture, `thresholdScore`, and v1 result fields
   (`overallScore`, `grade`, `categories`); add stages and evidence tiers alongside.
4. **Everything deterministic ships in 2.0**; adopt solid npm packages where they exist
   (researched: adopt `hedges`, `dice-coefficient`, `okapibm25`, optionally `syllable`;
   hand-roll promo/CTA lexicon and price-presence; skip minisearch/keyword-extractor/
   text-readability/sentiment/stopword - rationale in each section).

---

## 1. Scoring architecture (core)

### 1.1 Factor metadata registry (new `src/modules/audits/stage.ts`)

- `FACTOR_REGISTRY: Record<FactorNameType, {stage, evidence, citations, blocking?}>`,
  compile-time exhaustive. `makeFactor` keeps its signature and stamps `evidence`/`citations`
  from the registry, so the 7 category modules need near-zero changes.
- Add `makeDiagnostic(name, value)` helper: `score: 0, maxScore: 0, status: "info"`.
  `"info"` is a NEW value added to `FactorStatusSchema` (enum superset; safe for old baselines).
  Renderers get an "unscored diagnostic" badge for it; `generateRecommendations` treats info
  factors as low-priority advisory (never point-bearing).
- Stages: `technicalEligibility` | `retrievalAlignment` | `citationFitness` | `provenance`.
- Evidence tiers: `supported` | `conditional` | `heuristic` | `diagnostic` | `experimental`.
- `CITATION_GATES: GateSpecType[]` - deterministic predicates over rawData/queries/domain that
  CAP the citationFitness stage pct (never add points): `staleVisibleDate` (cap 50),
  `offTopicForQueries` (cap 50; only when queries configured; trips when every query's best
  coverage < 0.2), `missingPriceProduct` (cap 60; product pages only). Cap values labeled
  expert-set heuristics.

### 1.2 Schema changes (ALL additions optional; nothing v1-required removed or retyped)

- `FactorResultSchema` += `evidence?`, `citations?: string[]` (paper-review slugs).
- `AnalyzerResultSchema` += `schemaVersion?` (writer always sets `RESULT_SCHEMA_VERSION = 2`,
  a constant independent of build VERSION), `stages?: StageScoresSchema`; `meta` +=
  `stageWeights?`, `queries?`, `domain?`, `engine?`.
- `StageScoresSchema` (new in scoring/schema.ts): per-stage `{score, maxScore, pct|null,
suppressed}`; eligibility adds `{status: pass|fail, blockers[]}`; citationFitness adds
  `{uncappedPct, gates: GateResult[]}`.
- `RecommendationSchema`: `expectedGain` -> `auditPoints?` (+ `evidence?`, `citations?`,
  `direction?`); zod strips the old key from baselines.
- New category keys in `CategoryNameSchema`: `structuralAlignment` (always on; renamed from
  design drafts to avoid colliding with the `retrievalAlignment` STAGE name), `queryAlignment`
  (present only when queries supplied), `productFit` (product pages only).
  `CategoryWeightSchema` auto-derives; old 7-key weight configs parse (per-key `.default(1)`).
- `AuditRawDataSchema` += `queryAlignment?` (per-query coverage detail), `domainDetected?`.

**Baseline/migration safety (verified):** `loadBaselineResult` (`diff/history.ts:96`) validates
with `AnalyzerResultSchema`; since all additions are optional, pre-2.0 baselines parse unchanged.
`updateConfig` re-validation likewise unaffected. Guarded by a real-fixture test (section 5).

### 1.3 Denominator + computeScore v2 (`src/modules/scoring/service.ts`)

- `sumFactors`/`maxFactors` (the single choke point) skip `status === "neutral"` and
  tier `diagnostic`/`"info"` factors: fixes the documented neutral-denominator bug.
- `computeScore`: renormalize weights over categories with `maxScore > 0` (entityClarity can
  legitimately hit max 0 now); default overall stays category-weighted; if user sets
  `stageWeights`, overall switches to stage-weighted. Eligibility failure caps overall at
  `ELIGIBILITY_FAIL_CAP = 25` (grade F). Gates cap the stage pct only, NOT overall
  (ship without a gate-overall cap; it is a one-constant change if wanted later - open decision).
- New `src/modules/scoring/stages.ts`: `computeStages(categories, rawData, {queries, domain})`
  per the gate logic above; eligibility blockers = registry-`blocking` factors with critical
  status (Fetch Success, Text Extraction Quality) or all AI crawlers blocked.

### 1.4 Diff v2 (`src/modules/diff/`)

Optional additions to `DiffResultSchema`: `stageDeltas?`, `queryDeltas?` (per-query coverage
delta + `regressed` flag), `crossVersion?`. `computeDiff` recomputes stages for v1 baselines via
the registry (factor names unchanged) and sets `crossVersion: true` ("baseline scored by v1
rules; deltas indicative"). CategoryDelta gains pct fields (raw points shift across the
denominator change). Optional: timeline plateau note when last 3 entries are non-increasing.

## 2. Factor dispositions (all 39 v1 factors + new)

Full draft table maintained during design (kept below for the implementer); headline moves:

- **Demote to diagnostics** (`makeDiagnostic`, tier diagnostic, out of denominator):
  Lists/Tables Presence, Paragraph Structure, Scannability, Section Length (formatting causally
  null - What Gets Cited), Q/A Patterns, Answer Capsules char rule, Word Count Adequacy,
  Transition Usage, LLMs.txt Presence (tier `experimental`), Image Accessibility (a11y info),
  Publication Date (becomes "Date Markup" diagnostic), Entity Density (replaced, below).
- **Readability floors** (`readability/index.ts`): Sentence Length 10 (full unless avg > 35),
  Flesch 10 (full unless < 30), Jargon Density 10 (full unless ratio > 0.10; tier conditional,
  SAGEO -14%). Recommendations fire only below floors.
- **Freshness inversion fix** (`authority-context/`): new `time-sensitivity.ts` detector
  (NewsArticle/Event JSON-LD, year tokens, trend vocab, /news|/blog paths) emits a diagnostic;
  Content Freshness (12, conditional) scored ONLY when time-sensitive: recent (<=24mo) = 12,
  **no parseable date = neutral**, visibly stale = 0 + trips `staleVisibleDate` gate. Month
  bands deleted. Rewrite both freshness builders; delete "65%"/"hard gate" claims.
- **Entity Density -> "Term Repetition Balance"** (8, conditional, inverse-only): top salient
  term share of words: <=2.5% full, 2.5-4% warning band, >4% zero + over-optimization warning.
  Entity Richness 20 -> 12 (heuristic), Topic Consistency 25 -> 18 (conditional).
- **Keep scored with re-tiers**: Fetch Success + Text Extraction Quality (supported, blocking),
  Boilerplate Ratio, AI Crawler Access (supported; blocking only when ALL crawlers blocked),
  Heading Hierarchy (heuristic 11; superseded emphasis by structural alignment), Structured
  Data (conditional, retrieval framing), Schema Completeness (heuristic), Definition Patterns,
  Direct Answer Statements (conditional; folds toward Lead Summary), Step-by-Step, Summary/
  Conclusion, External References / Citation Patterns / Numeric Claims / Attribution Indicators /
  Quoted Attribution (conditional-to-heuristic, evidence-adjacency framing, counts capped),
  Author Attribution / Organization Identity / Contact-About (heuristic provenance),
  Entity Consistency (conditional).

## 3. New modules and factors

Build order respects dependencies (NLP salience first).

1. **`src/modules/nlp/support/salience.ts`**: `extractSalientTerms(text)` -> top ~10 entities +
   topics + salient numbers (existing extractors + NUMERIC_CLAIM_PATTERNS + compromise numbers),
   frequency x position boost, cached in `runAudits`. Dep: `dice-coefficient@^2.1.1` for fuzzy
   multiword matching (threshold 0.8; maintained replacement for deprecated string-similarity).
2. **`src/modules/structural-alignment/`** (new always-on category, weight 1.5, the SAGEO
   headline): Title Entity Alignment (12), Meta Description Alignment (8), Heading Entity
   Alignment (10), Structured Data Alignment (6) - coverage (never density) of salient items in
   each field via whole-word or dice>=0.8; anti-stuffing note in builders. All conditional/RA.
3. **`answerability/lead-summary.ts`**: "Lead Summary" factor (13, conditional, CF; 3-paper
   convergence): 5 pts intro paragraph under H1 before first H2 (30-150 words), 5 pts explicit
   TLDR/Key-Takeaways/Overview marker in first 150 words, 3 pts first paragraph contains a top
   salient entity + a DIRECT_ANSWER pattern.
4. **`grounding-signals/hedging.ts`**: "Hedged Language" (10, conditional, CF): share of
   sentences containing a hedge; <=5% -> 10, <=12% -> 6, <=20% -> 3, else 0.
   Dep: `hedges@^2.0.1` (curated 162-term lexicon; curation is the value).
5. **`entity-clarity/pronouns.ts`**: "Pronoun Ambiguity" diagnostic: paragraphs (>25 words)
   whose first sentence opens with a pronoun subject (regex + compromise #Pronoun confirm).
6. **`authority-context/commercial.ts`**: three diagnostics (heuristic, provenance): Promotional
   Language (compromise #Superlative + hand-rolled ~40-phrase CTA/promo lexicon + exclamation
   density), Affiliate Link Density (URL pattern list), Ad Slot Markers (DOM selectors).
7. **`content-extractability/paywall.ts`**: "Paywall Signals" scored (8, heuristic, TE):
   `isAccessibleForFree:false` or >=2 paywall DOM/text markers -> 0; 1 marker -> 4; clean -> 8.
   Prerequisite: move `json-ld.ts` from authority-context to `src/modules/extractor/json-ld.ts`
   (shared).
8. **`src/modules/domain-profile/`** + **`src/modules/product-fit/`**: `domain: auto|product|
informational` (config + `--domain`); auto-detect via Product/Offer JSON-LD, og:type,
   price+cart vocabulary. Product pages get conditional `productFit` category: Price Presence
   (15, supported-in-domain, gatekeeper; JSON-LD offers.price or currency regex; hand-rolled),
   Technical Specifications (10, conditional; spec tables/dl/labeled bullets/model-number regex),
   Comparison Content (8, conditional). Every product report carries the SAGEO shopping warning.
   Informational pages get "Explanatory Depth" (10, heuristic; causal/how-why marker density).
9. **`src/modules/query-alignment/`** (conditional category; config `queries` max 10 +
   repeatable `--query`; suggest ~5): Query Term Coverage Structural (15, supported, RA),
   Query Term Coverage Body (15, supported, CF), Query Aspect Coverage (10, heuristic, CF;
   aspects = query entities + noun phrases, scored against headed sections via
   `okapibm25@^1.4.1`). **Factor score = worst-case query (min), not mean** (IF-GEO); rawData
   carries per-query detail, worst query named, covered-count ("serves 3 of 5"); cross-query
   conflict note when term overlap < 0.2 and scores diverge > 30 pts. TLDR leads worst-case.
10. **Engine presets** (`config/engine-presets.ts`; config `engine: generic|gemini|gpt|
perplexity` + `--engine`): static category-weight overlays (gemini: structure x1.3;
    gpt: grounding x1.3 + authority x1.2; perplexity: structuralAlignment x1.2 + authority x1.2),
    always with an "Experimental preset" report banner.
11. **Site-type + host profile**: `authority-context/site-type.ts` diagnostic (forum/UGC
    detection: DiscussionForumPosting/QAPage JSON-LD, generator meta, URL segments) with the
    GPT-cites-forums-less note; sitemap mode gains a descriptive Host Profile section
    (og:site_name uniformity, Organization schema consistency, byline coverage, about/contact,
    TLD as descriptive fact only - no TLD bonuses).

## 4. Recommendations engine overhaul (`src/modules/recommendations/`)

1. **Delete false claims** (verified lines): constants.ts:513 (30-40% quotes), :342/:349 (72%
   capsules), :625/:639/:637-644 (65% freshness/hard gate), :466-469 (3x Princeton example),
   :275/:279 (120-180 sweet spot), :53-62 (300-3000 ideal); examples.ts:57-58, :65-69, :72,
   :89-90, :135.
2. **Direction tags + conflict detection**: builders gain `direction?: simplify|deepen|shorten|
expand|add|remove`; when opposing tags fire on one page, merge into a single item naming the
   tension and asking which audience/query set the page serves (IF-GEO largest ablation).
3. **Polish gate** (`recommendations/polish.ts`): FRE 50-75 + avg sentence 12-24 + boilerplate
   < 0.4 + heading structure -> suppress simplify/stylistic-rewrite recs with the FeatGEO note.
4. **Fidelity note** appended to every `add`-direction builder (statistics/quotes/citations/
   specs): additions must be real and verifiable (MAGEO hallucination penalties).
5. **Non-additive framing**: `expectedGain` -> `auditPoints`; display top 3 with the
   "apply, then re-measure; gains do not stack (1.90x vs 4.52x)" footer; full list in JSON.
6. **New builders** for every new factor (Record type enforces); diagnostics get info-toned
   builders. TLDR: delete projectedScore/projectedGrade/applyWinsToCategories; new shape
   `{score, grade, topFixes[{factor, category, auditPoints}], stages, note}`.

## 5. Renderers, CLI, MCP, tests

- **Renderers** (pretty/md/html/json + view-model): stage rollup section (eligibility pass/fail
  banner with blockers, gate rows with tripped/cap, suppressed stages), evidence-tier badges,
  "unscored diagnostics" grouping, `"info"` status handling, non-additive copy, product warning,
  engine-preset banner, host profile (sitemap), diff stage/query-delta blocks.
- **CLI** (`cli/program.ts`): `--query <q>` repeatable, `--domain`, `--engine`. **MCP**
  (`mcp/schema.ts`, `tools.ts`): optional `queries`/`domain` args; description rewritten
  (drops "research-backed"/"7-category", adds stages + heuristic-with-evidence-tiers framing).
- **Exports** (`src/index.ts`): `StageScoresType`, `EvidenceTierType`, `computeStages`, new
  option types.
- **Tests**:
  - PR-1 (pure refactor, green on v1): `tests/helpers/` (page/factors/results/config/http)
    extracted from the 17 duplicating files; helpers become the single churn point.
  - Real fixtures: `tests/fixtures/baselines/v1.6.2-result.json` captured by actually running
    `npx aiseo-audit@1.6.2 --json` (never hand-written) + a v1-only config fixture.
  - New `tests/invariants/`: scoring-invariants (denominator exclusion, eligibility cap, stage
    ranges, totalPoints identity), baseline-compat (v1 fixture loads through loadBaselineResult;
    computeDiff works cross-version), output-contract (freeze `overallScore`/`grade`/
    `averageScore`/`averageGrade` + NEW tldr shape + MCP raw-result contract).
  - Band-test policy: evidence-tiered factors get boundary-value tests with hardcoded numbers
    (never import bracket constants); demoted/heuristic factors get invariants (monotonicity,
    rich>poor, score<=maxScore); never assert exact overallScore.
  - Registry guards: every factor has a builder; no recommendation string matches
    `/research shows|according to .*research|Princeton/i`.
  - Both branches of every gate tested; coverage stays 70/70/50.

## 6. Docs

1. NEW `docs/EVIDENCE.md`: one row per factor (incl. demoted): factor -> category -> tier ->
   paper-review citations -> regime -> stage -> metric. Source of the AUDIT_BREAKDOWN column.
2. `docs/RESEARCH.md`: banner deferring to EMERGING_RESEARCH; annotate Tier 1-5 claims
   confirmed/contradicted/unverified; Sources labeled non-peer-reviewed. Kept as history.
3. NEW `docs/FUTURE_PHASES.md` (2.1+): EngineProbe interface + Twin-Branch protocol + DSV-CF;
   repeated-measurement CIs (Kirsten constants: 9-27% 5-min flips, 18% 2-month overlap);
   calibration study (EMERGING_RESEARCH's 8 validation requirements); headless-render layout
   checks (Naver 81% text-only vs 97% multimodal); LLM-assisted query mining (IF-GEO prompt).
4. `docs/AUDIT_BREAKDOWN.md`: Stage Architecture section; Evidence column everywhere; new
   bands; Sources rewritten peer-reviewed-first, vendor links quarantined.
5. `README.md`: "research-informed heuristic audit" reframe; instability honesty paragraph
   NEXT TO the determinism claim; pro-GEO Kirsten citation (53% of AIO domains outside top-10
   organic); new flags/config/output; "Migrating from 1.x"; docs list gains EVIDENCE/
   EMERGING_RESEARCH/paper-reviews/MIGRATION/FUTURE_PHASES.
6. NEW `docs/MIGRATION-2.0.md`: breaking-changes table (scores shift wholesale - re-baseline;
   fail-under recalibration; demotion list; recommendation strings rewritten), what did NOT
   change (JSON top-level names, exit codes, action outputs, MCP tool name, config compat).
7. `CONTRIBUTING.md`: adding a factor now requires registry entry (tier+stage+citations) +
   EVIDENCE.md row; thresholds without evidence must be labeled heuristic.
8. Description strings: package.json:4, action.yml:2, mcp/schema.ts, server.json,
   packages/aiseo-audit-mcp/package.json. NEW root `CHANGELOG.md` (Keep-a-Changelog; first
   entry 2.0.0); RELEASING.md gains the CHANGELOG step.

## 7. Release sequence (verified against action.yml and RELEASING.md)

- **Phase 0, BEFORE 2.0 hits npm** (critical: `action.yml` `version` defaults to `latest` and
  runs `npx aiseo-audit@latest`, so every `@v1` action user would silently execute 2.0):
  change the default to `1`, cut a final 1.x release, re-point floating `v1` tag.
- Phase 1: `npm version major`; push tags; `npm publish` (prepublishOnly gates).
- Phase 2: GitHub release v2.0.0 (Marketplace checked); create floating `v2` tag; keep `v1`.
- Phase 3 (order matters): bump `packages/aiseo-audit-mcp` to 2.0.0 with dep `^2.0.0`, publish;
  sync `server.json` (both versions + description); mcp-publisher republish (REQUIRED: tool
  description/surface changed).
- Phase 4 (delayed 1-2 weeks): `npm deprecate "aiseo-audit@<2.0.0" "Superseded by the
research-driven 2.0 (evidence-tiered factors, stage scores). Migration:
<MIGRATION-2.0.md URL>"` (quoted range; wording "superseded", not "broken") and deprecate
  `aiseo-audit-mcp@1.0.0` (pins ^1.6.0 forever).

## 8. Milestones (PR breakdown)

- **M0 (parallel)**: PR-1 test helpers refactor; PR-2 v1 fixtures + baseline-compat test;
  PR-3 EVIDENCE.md skeleton + RESEARCH annotations + FUTURE_PHASES.md.
- **M1 (serial backbone)**: PR-4 schemas + FACTOR_REGISTRY + makeDiagnostic/"info" status +
  denominator fix + computeStages + gates + config additions + scoring/stage tests
  (split schema-first if too large).
- **M2 (parallel per module after M1)**: PR-5 salience + structural-alignment; PR-6 demotions +
  readability floors + freshness fix + term-repetition; PR-7 lead summary + hedging + pronouns +
  paywall + commercial + site-type; PR-8 domain profiles + product-fit + query-alignment +
  engine presets. Each PR: factor-names entries, registry rows, tests, EVIDENCE.md rows.
- **M3 (after M2)**: PR-9 recommendations overhaul (deletions, direction/conflict, polish gate,
  fidelity notes, auditPoints, new builders, regex guard test).
- **M4 (parallel with M2/M3 after M1)**: PR-10 renderers + tldr + CLI flags + MCP + exports +
  output-contract test + host profile rendering.
- **M5**: PR-11 AUDIT_BREAKDOWN/README/MIGRATION/CONTRIBUTING (needs frozen bands).
- **M6**: PR-12 CHANGELOG + description strings + launcher + server.json; then release
  Phases 0-4.

## 9. Verification

- `npm run ci` (format + tsc + coverage 70/70/50 + build) green on Node 20 and 22 throughout.
- Invariant suite proves: denominator excludes neutral/diagnostic; eligibility failure caps
  overall at 25/F; gates cap stage pct; v1.6.2 baseline fixture loads and diffs; v1 config
  parses; output contract (4 stable JSON fields + new tldr + MCP shape) holds.
- End-to-end smoke: `node bin/aiseo-audit.js <real URL> --json` (and with `--query` x5,
  `--domain product`, `--engine gpt`, `--sitemap`, `--diff` against the v1 fixture); MCP smoke
  via the RELEASING.md initialize+tools/list pipe; run the GitHub Action locally-equivalent
  script path against the built JSON to confirm score/grade extraction.
- Recommendation regex guard proves no unsupported research claims ship in output strings.
- Manual review of one rendered pretty/html report for stage banner, tier badges, diagnostics
  grouping, non-additive footer.

## Open decisions (deliberate, flagged for during implementation)

1. Gates cap the citationFitness stage only; making them bind overall is a one-constant change
   (ship without, revisit after feedback).
2. Exact maxScore rebalance numbers are expert-set heuristics; the table in section 2/3 is the
   starting allocation, to be finalized in M2 PRs and labeled as heuristic in EVIDENCE.md.
3. `--all-recs` flag name (or JSON-only) for the full recommendations list beyond top 3.

## Reference: full 39-factor disposition table

| v1 factor (max)               | 2.0 action                                             | Tier         | Stage |
| ----------------------------- | ------------------------------------------------------ | ------------ | ----- |
| Fetch Success (12)            | keep, blocking gate                                    | supported    | TE    |
| Text Extraction Quality (12)  | keep, blocking                                         | supported    | TE    |
| Boilerplate Ratio (12)        | keep                                                   | conditional  | TE    |
| Word Count Adequacy (12)      | diagnostic                                             | diagnostic   | -     |
| AI Crawler Access (10)        | keep; blocking iff all blocked                         | supported    | TE    |
| LLMs.txt Presence (6)         | diagnostic                                             | experimental | -     |
| Image Accessibility (8)       | diagnostic (a11y info)                                 | diagnostic   | -     |
| Heading Hierarchy (11)        | keep 11                                                | heuristic    | RA    |
| Lists Presence (11)           | diagnostic                                             | diagnostic   | -     |
| Tables Presence (8)           | diagnostic                                             | diagnostic   | -     |
| Paragraph Structure (11)      | diagnostic                                             | diagnostic   | -     |
| Scannability (11)             | diagnostic                                             | diagnostic   | -     |
| Section Length (12)           | diagnostic                                             | diagnostic   | -     |
| Definition Patterns (10)      | keep                                                   | heuristic    | CF    |
| Direct Answer Statements (11) | keep                                                   | conditional  | CF    |
| Answer Capsules (13)          | diagnostic                                             | diagnostic   | -     |
| Step-by-Step Content (10)     | keep                                                   | heuristic    | CF    |
| Q/A Patterns (11)             | diagnostic                                             | diagnostic   | -     |
| Summary/Conclusion (9)        | keep 9                                                 | heuristic    | CF    |
| Entity Richness (20)          | keep at 12                                             | heuristic    | RA    |
| Topic Consistency (25)        | keep at 18                                             | conditional  | RA    |
| Entity Density (15)           | replace: Term Repetition Balance (8, inverse-only)     | conditional  | RA    |
| External References (13)      | keep, attribution framing                              | heuristic    | CF    |
| Citation Patterns (13)        | keep, evidence-adjacency                               | conditional  | CF    |
| Numeric Claims (13)           | keep, caution copy                                     | conditional  | CF    |
| Attribution Indicators (11)   | keep                                                   | conditional  | CF    |
| Quoted Attribution (10)       | keep, claim deleted                                    | heuristic    | CF    |
| Author Attribution (10)       | keep                                                   | heuristic    | PR    |
| Organization Identity (10)    | keep                                                   | heuristic    | PR    |
| Contact/About Links (10)      | keep                                                   | heuristic    | PR    |
| Publication Date (8)          | diagnostic "Date Markup"                               | diagnostic   | -     |
| Content Freshness (12)        | rework: time-sensitive only; recent/neutral/stale+gate | conditional  | CF    |
| Structured Data (12)          | keep, retrieval framing                                | conditional  | RA    |
| Schema Completeness (10)      | keep                                                   | heuristic    | RA    |
| Entity Consistency (10)       | keep                                                   | conditional  | RA    |
| Sentence Length (15)          | floor-only 10                                          | heuristic    | CF    |
| Readability (15)              | floor-only 10                                          | heuristic    | CF    |
| Jargon Density (15)           | floor-only 10                                          | conditional  | CF/RA |
| Transition Usage (15)         | diagnostic                                             | diagnostic   | -     |

New: Title/Meta/Heading/StructuredData Alignment (12/8/10/6, conditional, RA); Lead Summary
(13, conditional, CF); Hedged Language (10, conditional, CF); Paywall Signals (8, heuristic,
TE); Price Presence (15, supported-in-domain, CF gate), Technical Specifications (10),
Comparison Content (8), Explanatory Depth (10, informational profile); Query Term Coverage
Structural/Body (15/15, supported), Query Aspect Coverage (10, heuristic); diagnostics:
Topic Time Sensitivity, Pronoun Ambiguity, Promotional Language, Affiliate Link Density,
Ad Slot Markers, Site Type, Date Markup.

New deps: `hedges@^2.0.1`, `dice-coefficient@^2.1.1`, `okapibm25@^1.4.1`, optional
`syllable@^5.0.1`. All pure JS, zero network, no native deps, MIT.
