# Future Phases: the 2.1+ Roadmap

Last updated: 2026-08-28

This document records what the peer-reviewed evidence justifies building next, and why none of it belongs in 2.0. The 2.0 release is a deterministic, static audit: it measures page properties, never engine outcomes. Everything below either calls engines, requires repeated measurement, or requires infrastructure the core package deliberately excludes. Evidence citations refer to the reviews in [paper-reviews/](paper-reviews/README.md).

## (a) Probe layer: measuring actual engine outcomes

### Motivation

The static audit cannot answer "was this page cited," and the literature says single-run measurement cannot either. [MAGEO](paper-reviews/mageo-findings-acl-2026.md) supplies the two design pieces a credible probe needs: the Twin-Branch protocol (freeze the retrieval list, generate the answer with and without the target document, attribute the difference causally to the page) and DSV-CF, a dual-axis metric that scores visibility together with attribution fidelity and penalizes miscitation. MAGEO's own gains came with a falling false-citation ratio (0.058 to 0.043), while keyword-forcing methods raised hallucination penalties: visibility without fidelity is a failure mode the field now measures.

### Design sketch

- An `EngineProbe` interface: `name` plus `answer(query) -> { text, citations }`.
- The Twin-Branch protocol as the measurement design: frozen candidate set, paired runs with and without (or with original vs edited) the target page, diffed outcomes.
- A DSV-CF-style dual-axis outcome: visibility (cited, prominence, share of answer) and attribution fidelity (was the citation accurate to the page), with an explicit miscitation penalty.
- User-supplied adapters implement `EngineProbe` for whichever engines the user has access to; the package ships the protocol and the reporting, not API keys or scrapers.
- Shipped as a separate optional package so the core audit stays dependency-free and deterministic.

### Prerequisites

- The repeated-measurement machinery in (b), since single probe runs are unreportable.
- 2.0's query alignment work (`--query`), because probes are meaningless without a target query set.
- A stable report schema for stage scores, so probe outcomes can be reported alongside (not blended into) static scores.

**Not in 2.0 because:** it requires live engine access, per-run cost, and nondeterministic outputs; the 2.0 contract is a deterministic audit with no network calls beyond fetching the page itself.

## (b) Repeated-measurement confidence reporting

### Motivation

[Characterizing Web Search](paper-reviews/characterizing-web-search-findings-acl-2026.md) (Kirsten et al.) measured deployed engines and found that 9 to 27% of certain answer decisions change within five minutes at temperature zero, and that only 18% of Google AI Overview's cited pages recurred across two months, versus 45% for organic search. Those constants set the sampling floor for any outcome measurement: detecting a real citation-rate change smaller than the flip noise requires many repetitions.

### Design sketch

- Minimum repeat intervals baked into the probe runner: each query repeated across at least a 5-minute and a 24-hour interval, to separate stochastic flip from temporal drift.
- Flip-rate reporting per query, alongside citation rate, so users can see when their "change" is inside engine noise.
- A hard rule: never report single-run results. One-run outcomes are withheld or labeled unreportable.
- Aggregation before trend display: the probe layer averages over runs before ever showing a trend line.

### Prerequisites

- The probe layer in (a); this is its reporting discipline.
- Storage for run history (the existing `--diff` history machinery is the natural substrate).

**Not in 2.0 because:** there are no engine outcomes to repeat in a static audit; 2.0's measurements are deterministic and reproducible by construction, so confidence intervals over runs would be theater.

## (c) Calibration study: fitted weights instead of expert-set ones

### Motivation

Every weight and threshold in 2.0 is an expert-set heuristic. [EMERGING_RESEARCH.md](EMERGING_RESEARCH.md#requirements-for-calling-the-score-scientifically-validated) lists the eight requirements for calling the score scientifically validated, including fitting weights on a training partition of recorded outcomes and testing calibration on unseen pages. No reviewed paper does this for an audit score, and we cannot claim it until we do it.

### Design sketch

- Use the probe layer to record retrieval, reranking, citation, prominence, and factual-absorption outcomes for a large, diverse held-out page collection, with queries defined independently of audit results.
- Fit stage-score weights on a training partition; evaluate calibration and predictive performance on unseen pages; report confidence intervals, missing-data handling, and engine-specific effects.
- Re-run after significant engine or model changes (the two-month 18% overlap result says learned weights will decay).
- Publish the study alongside the fitted weights so the "research-derived" label is checkable.

### Prerequisites

- (a) and (b) operating long enough to accumulate outcome data across engines, paraphrases, and time.
- The per-factor traceability in [EVIDENCE.md](EVIDENCE.md), so fitted weights can be compared against the expert-set ones factor by factor.

**Not in 2.0 because:** the outcome data does not exist yet; shipping "calibrated" weights without the study would be exactly the over-claiming 2.0 removes.

## (d) Headless-render layout and authority checks

### Motivation

[Authority-Aware GenIR](paper-reviews/authority-aware-genir-acl-2026.md) (Naver) found text-only assessment reached 81% accuracy versus 97% for multimodal assessment against its authority rubric: the layout and ad-intrusiveness signals a deployed engine found decisive are invisible to an HTML parser. Our tool parses HTML and never renders, which 2.0 documents as a known blind spot.

### Design sketch

- Optional headless render (Playwright or similar) behind a flag, off by default.
- Simple layout heuristics on the rendered page: ad density above the fold, interstitial and overlay detection, content-to-chrome ratio, paywall overlays that static markers miss.
- Results reported as diagnostics in the commercial-intent block, not scored, until an outcome study links them to citation visibility.

### Prerequisites

- A dependency policy decision: headless browsers are heavy, so this likely lives in the optional package with (a).
- Agreement on which rendered-layout measurements are stable enough to diff over time.

**Not in 2.0 because:** it adds a browser dependency and nondeterminism (rendered layout varies by viewport, timing, and ad fill) to a package whose core promise is a fast, deterministic static audit.

## (e) LLM-assisted reverse query mining

### Motivation

Query alignment is the best-supported new capability in 2.0, but it requires the user to supply queries. [IF-GEO](paper-reviews/if-geo-findings-acl-2026.md) ships the missing onramp: a search-analyst prompt ("act as a search analyst; infer the queries that should lead to this page, weighted by likelihood") that mines representative latent queries from the page itself. Its ablation also showed roughly five queries is where multi-query stability plateaus, a sensible default suggestion.

### Design sketch

- An optional LLM-backed query miner that proposes a weighted candidate query set for a page, which the user confirms or edits before the alignment audit runs.
- Output feeds the existing multi-query reporting: per-query alignment, worst-case query, and coverage rate.
- The static fallback already ships in 2.0: candidate queries derived deterministically from title, H1, and section headings. The LLM path is an upgrade, not a requirement.

### Prerequisites

- An LLM dependency boundary (same optional package as the probe layer, or a bring-your-own-model adapter).
- The 2.0 multi-query report semantics, which this feature feeds rather than changes.

**Not in 2.0 because:** it requires an LLM call inside the audit path; 2.0 keeps the core LLM-free and ships the deterministic heading-derived fallback instead.

## Sequencing note

(a) and (b) ship together (a probe without repetition discipline is worse than no probe). (e) can ship independently as soon as an LLM boundary exists. (d) is independent but low priority. (c) depends on everything above and is the long pole; until it lands, all scores remain labeled as expert-set heuristics per [EVIDENCE.md](EVIDENCE.md).
