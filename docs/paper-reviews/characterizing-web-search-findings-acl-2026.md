# Paper Review: Characterizing Web Search in the Age of Generative AI (Findings of ACL 2026)

**Paper:** Elisabeth Kirsten, Jost Grosse Perdekamp, Qinyuan Wu, Mihir Upadhyay, Krishna P. Gummadi, Muhammad Bilal Zafar (Ruhr University Bochum; UA Ruhr Research Center; MPI for Software Systems). "Characterizing Web Search in the Age of Generative AI." Findings of ACL 2026, pages 10827-10848, DOI 10.18653/v1/2026.findings-acl.526. [ACL Anthology](https://aclanthology.org/2026.findings-acl.526/) (read in full from the Anthology PDF). [Code](https://github.com/aisoc-lab/generative-search-eval)

**Reviewed:** August 28, 2026, against `aiseo-audit` v1.6.2. Previous reviews: [C-SEO Bench](c-seo-bench-neurips-2025.md), [AutoGEO](autogeo-iclr-2026.md), [SAGEO Arena](sageo-arena-kdd-2026.md), [What Gets Cited](what-gets-cited-sigir-2026.md), [FeatGEO](featgeo-acl-2026.md), [Mind Reader](mind-reader-acl-2026.md), [IF-GEO](if-geo-findings-acl-2026.md), [MAGEO](mageo-findings-acl-2026.md).

**What the paper does:** Unlike every other paper in this series, this one optimizes nothing. It measures how **real, deployed** generative search systems behave: Google Organic (top-100) vs Google AI Overview, Gemini 2.5 Flash with search, GPT-4o-Search, GPT-4o with search-as-a-tool, and Perplexity Sonar, across 4,706 queries in seven datasets (general web, chatbot-style, politics, recent regulatory actions, science, products, trends). Measured dimensions: how many and which sources each engine consults, how far beyond organic rankings they reach, what source types they prefer, how much topical coverage the answers achieve, and how stable the outputs are across five minutes, 24 hours, and two months. Queries issued at temperature 0 where configurable, from two countries.

**Evidence standard:** Large-scale observational measurement of production systems (September 2025 snapshot, with a July/August repeat). Not causal, no interventions; concept analysis relies on an LLM-based topic framework (acknowledged limitation). **Verification note: every claim our `EMERGING_RESEARCH.md` makes about this paper checked out exactly against the primary source** (source-count differences, AIO consulting beyond top-10/top-100, 18% vs 45% two-month overlap, 9 to 27% five-minute decision flips).

---

## 1. Evidence that contradicts research our framework cites

This paper's contradictions target how our tool _presents_ results more than what it measures.

| What we claim / implement                                                                                   | Where in our repo                           | What this paper found                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Paper evidence         |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| A single deterministic score presented as "AI search readiness," implicitly a proxy for citation likelihood | README positioning; single-run `analyzeUrl` | **Engine outputs are unstable even when nothing changes.** At temperature 0, 9 to 27% of yes/no/mixed answers flipped within _five minutes_ (Sonar worst at 27%); 15 to 28% within 24 hours. Over two months, only 18% of AI Overview's cited pages recurred (vs 45% for organic). Lexical overlap between repeated runs of the same query: Jaccard 0.27 to 0.63. Any single-execution citation observation is noise-dominated; a deterministic audit score must not be read as a citation probability.               | Tables 3, 4; Section 6 |
| Freshness as a universal scored factor                                                                      | `Content Freshness` in `authority-context`  | **Freshness matters conditionally, by query type.** Engines answering from internal knowledge scored 100% on static facts with zero searches, but failed on time-sensitive queries (GPT-Tool reported a recently deceased person as alive; 51% concept coverage on trends vs 72% for search-backed engines). The relevant axis is static vs dynamic information need, not page age bands. Aligns with What Gets Cited's freshness nuance and the domain-conditional freshness redesign already proposed in review #4. | Sections 4.2, 4.3      |
| One engine-agnostic model of "the AI engine"                                                                | package description; single factor set      | **Deployed engines differ by an order of magnitude in retrieval behavior**: median links consulted per query ranges from 0 (GPT-Tool) to 14 (Sonar); source-type composition differs sharply (GPT models favor corporate sites and encyclopedias, cite social media and forums far less, while organic results can be up to 35% forums/social). An audit cannot claim to model "generative engines" as one behavior.                                                                                                  | Figure 2; Section 5.2  |
| Implicitly, that citation snapshots are worth monitoring (a temptation for any future probe feature)        | v2 probe-layer sketches                     | **Which page gets cited churns; what topics the answer covers does not.** Conceptual coverage of answers remained largely stable across the two-month gap even as the cited sources turned over almost entirely. The stable optimization target is content-level topical coverage; the unstable one is any individual citation.                                                                                                                                                                                       | Section 6.1            |

## 2. What this paper established (no optimization evidence, by design)

This paper tests no interventions, so there is no "what increased citations" here. What it contributes is the measured shape of the environment any GEO claim lives in, and one finding that _supports_ our tool's premise more directly than anything in the optimization literature:

### 2.1 Generative engines cite far beyond organic rankings (the pro-GEO finding)

On average **53% of the domains Google AI Overview consults are not in the top-10 organic results, and 27% are not even in the top-100**. URL-level overlap between AIO citations and top-10 organic is under 50%. Generative engines also cite less-popular domains overall (81 to 86% within the Tranco top-1M vs 89% for organic; Sonar's median cited-domain rank is 5,647 vs organic's 2,352). Interpretation for our users: **pages that lose the classic SEO ranking game still get cited by generative engines**, which is the empirical justification for content-level AI-readiness auditing existing as a discipline separate from rank tracking. Our README asserts this vibe; this is the citable measurement.

### 2.2 The instability magnitudes (the measurement constants for any probe design)

| Interval          | Measurement                  | Result                       |
| ----------------- | ---------------------------- | ---------------------------- |
| 5 minutes, temp 0 | ternary answer flip rate     | 9 to 27% depending on engine |
| 24 hours, temp 0  | ternary answer flip rate     | 10 to 28%                    |
| 2 months          | cited-page overlap (Jaccard) | 18% (AIO) vs 45% (organic)   |
| 2 months          | concept coverage of answers  | largely stable               |
| repeated runs     | lexical overlap of answers   | Jaccard 0.27 to 0.63         |

Also structurally important: organic search _distributes_ disagreement (only 16% of ambiguous queries had all top-10 results agreeing in polarity), while generative search collapses plurality into one answer that itself changes over time.

### 2.3 Engine behavioral profiles (descriptive, deployed systems)

- Retrieval footprint: Sonar 14 links/query mean, AIO 9, Gemini 9, GPT-Search 4, GPT-Tool under 1 (median 0).
- AIO adapts retrieval depth to query type: open-ended queries pull 30+ pages, factoid queries 2 or fewer.
- Source types: GPT engines skew corporate/encyclopedia; forums and social media are cited much less than organic surfaces them.
- Topical coverage of answers is comparable to organic overall (0.71 to 0.78 vs 0.78), with organic retaining the edge on ambiguous queries.

## 3. Proposed updates to `aiseo-audit`

### 3.1 Ground the tool's honesty framing in these numbers (README + report copy)

The v2 plan already says the score is "a research-informed heuristic audit, not a validated citation predictor." This paper supplies the concrete sentence that makes that credible instead of hedging: "Deployed engines change 9 to 27% of their answer decisions within five minutes at temperature zero, and only 18% of Google AI Overview's cited pages recur across two months. No single-run measurement, including this audit, predicts individual citation outcomes." Put it in the README's methodology note and the report footer.

### 3.2 Lead with the pro-GEO measurement in the README

Replace the current vibes-based justification with the citable one: a majority of AI Overview's consulted domains sit outside the top-10 organic results, so content-level AI readiness is a distinct, real surface from classic rank. This is the strongest published argument for why the tool's users should care, and we should cite it precisely rather than approximately.

### 3.3 Probe-layer protocol constants (completes the spec from review #8)

Review #8 adopted Twin-Branch + DSV-CF as the probe design; this paper supplies the sampling requirements: (a) repeat each query at minimum across a 5-minute and a 24-hour interval to separate stochastic flip from temporal drift; (b) report flip rate per query alongside citation rate; (c) treat one-run results as unreportable. The 9 to 27% flip floor also gives the power calculation: detecting a real citation-rate change smaller than the flip noise requires many repetitions, which should be stated in the probe docs so users do not chase noise.

### 3.4 Reframe what `--diff` monitors

Since concept coverage is stable while individual citations churn, our diff/history feature is pointed at the right thing (page content properties) and should say so: an unchanged page whose citation status changed likely reflects engine churn, not page regression. One paragraph in the diff report explaining this prevents users from misreading engine noise as content failure. Conversely, a future probe layer should aggregate over runs before ever showing a trend.

### 3.5 Engine profile notes get deployed-system grounding

The engine profiles proposed in reviews #2 and #8 gain descriptive, deployed-system facts: footprint size per engine and source-type preferences. One concrete new diagnostic this enables: a **site-type note** in the report. If the audited page is forum/user-generated content, note that GPT-family engines cite such sources measurably less than Google surfaces them, so readiness work has different expected value per engine. Tier: `descriptive` (observational, one snapshot).

### 3.6 Freshness: the static/dynamic axis

Adds to the review #4 freshness redesign: the scored question should be "is this page's topic time-sensitive, and if so is the content current," not "how old is the page." Static-topic pages should get freshness marked not-applicable (excluded from the denominator per the v2 fix). Detecting time-sensitivity statically is approximable (dates in title, event/news schema types, trend-like vocabulary) and worth a diagnostic before it is worth a score.

### What this paper does NOT justify changing

- Any scored factor's weight: the paper is observational and tests no content interventions.
- Abandoning single-run auditing of _content properties_: our static measurements are deterministic and reproducible; it is citation _outcomes_ that are noise-dominated.
- Treating the September 2025 snapshot as permanent: engine behaviors shifted measurably within the paper's own two-month window; the descriptive profiles need re-verification over time (the paper's own motivation for longitudinal evaluation).
- Concept-coverage conclusions as ground truth: the topic analysis is LLM-based (LLooM), an acknowledged bias source.
