# Paper Review: FeatGEO (ACL 2026)

**Paper:** Zikang Liu, Peilan Xu (Nanjing University of Information Science and Technology). "Think Before Writing: Feature-Level Multi-Objective Optimization for Generative Citation Visibility." ACL 2026 main conference, pages 20290-20303, DOI 10.18653/v1/2026.acl-long.929. [ACL Anthology](https://aclanthology.org/2026.acl-long.929/) (read in full from the Anthology PDF). [Code](https://github.com/EvoNexusX/2026LiuFeatGEO.git)

**Reviewed:** August 28, 2026, against `aiseo-audit` v1.6.2. Previous reviews: [C-SEO Bench](c-seo-bench-neurips-2025.md), [AutoGEO](autogeo-iclr-2026.md), [SAGEO Arena](sageo-arena-kdd-2026.md), [What Gets Cited](what-gets-cited-sigir-2026.md).

**What the paper does:** Abstracts a webpage into 13 interpretable features across three layers (structure: intro summary, heading level, list density, length; content: statistics, cited sources, quotations, unique info, technical terms; language: authoritative tone, simplicity, fluency, keyword focus), then searches that feature space with a genetic algorithm (NSGA-II) optimizing citation visibility and content quality jointly, with an LLM turning each feature configuration into an actual page. Tested on GEO-Bench (advertiser page injected alongside the top-5 retrieved pages) against three generative engines: GPT-4o-mini, Gemini 2.5 Flash, Qwen-plus. Each configuration evaluated 5 times.

**Evidence standard:** Uses the original GEO paper's word-position-weighted visibility metric (the one C-SEO Bench criticized) plus an LLM-judged quality score. No statistical significance testing. Retrieval is assumed (the authors are explicit: FeatGEO "optimizes citation likelihood conditional on retrieval"). Verification note: all four claims our `EMERGING_RESEARCH.md` makes about this paper (heuristics hurt fluent pages, +0.99 average on human-written pages, Statistics +2.33 as best original heuristic, +37/73/96% for FeatGEO) match the primary source.

---

## 1. Evidence that contradicts research our framework cites

The core finding is that **the same edit helps or hurts depending on the page's starting quality**, which contradicts fixed-threshold scoring more than any individual factor.

| What we claim / implement                                                                                             | Where in our repo                                      | What FeatGEO found                                                                                                                                                                                                                                                                                                                                                                                                           | Paper evidence       |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| GEO methods as universal positives (Tier 2 "High Impact")                                                             | `docs/RESEARCH.md`                                     | **On already-fluent (LLM-generated) pages, all nine GEO heuristics reduced visibility on all three engines.** GPT-4o-mini: baseline 13.34 vs 10.92 to 12.21 for every heuristic. Gemini: baseline 8.89 vs 4.62 to 5.62 (visibility nearly halved). Qwen-plus: 5.20 vs 2.75 to 3.72. Even on the GEO paper's own favorable metric and benchmark.                                                                              | Table 2              |
| Fixed absolute thresholds regardless of page state (every factor scored against static brackets via `thresholdScore`) | `src/modules/scoring/service.ts` and all audit modules | **Regime-dependent saturation:** the same heuristics that hurt fluent pages gave +0.99 average visibility on less-polished human-written pages (Statistics +2.33, Fluency +1.49, Quotation +1.25; Unique Words still negative at -2.38). Whether an intervention helps is conditional on starting quality, which our scoring never measures.                                                                                 | Table 4, Section 4.4 |
| Readability and fluency scored monotonically higher-is-better (`readabilityForCompression`, 4 factors)                | `src/modules/readability/index.ts`                     | In optimized configurations, **fluency emphasis had a negative marginal contribution to visibility (-0.009)**, as did keyword focus (-0.007) and easy-to-understand (-0.004). The high-visibility Pareto solutions were not the maximally readable ones.                                                                                                                                                                     | Figure 4, Table 5    |
| Keyword/entity density as positive (`Entity Density`, `Topic Consistency` keyword repetition)                         | `src/modules/entity-clarity/index.ts`                  | Keyword focus intensity reduced visibility at the margin. Combined with prior papers, the distinction sharpens: query-term _presence_ helps (What Gets Cited, OR 6 to 40), repetition _intensity_ hurts (here; AutoGEO's Keyword Stuffing; SAGEO's dilution finding). Our density scoring measures intensity, the harmful variant.                                                                                           | Figure 4             |
| AutoGEO as validated state of the art (review #2)                                                                     | [autogeo-iclr-2026.md](autogeo-iclr-2026.md)           | **Second independent negative replication.** AutoGEO-global scored _below the unmodified baseline_ on all three engines even in the fixed-context setting it was designed for (11.22 vs 13.34; 5.70 vs 8.89; 3.37 vs 5.20) when applied to fluent pages. SAGEO Arena showed it fails at retrieval; this shows it can fail conditional on retrieval too. Its one strong result here: +4.13 on unpolished human-written pages. | Tables 2 and 4       |
| Per-factor `expectedGain` as additive points                                                                          | `src/modules/recommendations/service.ts`               | "The effect of any individual feature can depend on the specific combination of other features" with substantial within-group variance. Factor effects are interactive, not additive. Fourth paper undermining additive gain framing.                                                                                                                                                                                        | Section 4.6          |

An honest tension to record rather than smooth over: FeatGEO's ablation found structural features (headings +0.010, length +0.010, lists +0.007) gave _consistent moderate positive_ contributions to word-count visibility, while What Gets Cited found formatting causally null for first-citation choice. Different metrics (how much text cites you vs whether you are cited first), different designs (optimized bundles vs single-factor isolation). Both can be true: structure may increase how much of a cited page gets used without changing whether it wins the citation. Our tool's user cares about both, so reviews should stop treating "formatting" as one question.

## 2. What reproducibly increased LLM visibility, how it was tested, and the results

### 2.1 Feature-bundle optimization (the headline result)

**How tested:** NSGA-II searches the 13-feature space; each candidate configuration is realized as a page by a fixed generator (GPT-4o-mini), injected alongside the top-5 retrieved pages, and scored on visibility (5 runs) and LLM-judged quality. The best-visibility Pareto solution is reported.

**Results (visibility, baseline → FeatGEO):** GPT-4o-mini 13.34 → **18.31** (+37% relative), Gemini 2.5 Flash 8.89 → **15.35** (+73%), Qwen-plus 5.20 → **10.17** (+96%), with quality maintained or improved (79.17 → 81.52 on GPT-4o-mini). Rankings held under two alternative quality judges (Gemini, Claude), and the advantage was stable when the page generator was swapped across Qwen3 4B/8B/14B, suggesting the learned configurations encode model-agnostic principles rather than one generator's quirks.

### 2.2 The feature ablation (closest thing to per-factor evidence here)

**How tested:** clamp one feature to its minimum, re-optimize the other 12, measure the visibility drop. Within-bundle marginal contributions, not isolated causal effects:

| Direction                     | Features (contribution to visibility)                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Strong positive               | Statistics density (+0.025, largest by 2x), cited-sources density (+0.013), quotations (+0.011)                      |
| Moderate positive, consistent | Headings (+0.010), length/depth (+0.010), list density (+0.007), intro summary (+0.004), authoritative tone (+0.006) |
| Near zero                     | Technical terms, unique info                                                                                         |
| Negative                      | Fluency emphasis (-0.009), keyword focus (-0.007), easy-to-understand (-0.004)                                       |

Note what this does and does not say: _within already-optimized bundles_, evidence-density features (statistics, sources, quotes) carry the most visibility on the word-count metric. It does not resurrect "mechanically append statistics" (C-SEO Bench's citation-rank harm stands; different metric, different intervention).

### 2.3 The regime-dependence result (most transferable single finding)

**How tested:** apply the identical nine heuristics to LLM-generated (fluent) vs human-written (less polished) advertiser pages, same benchmark, same engines.

**Results:** fluent pages: all heuristics negative (Table 2). Human-written pages: average +0.99 (18.72 → 19.71), best performers AutoGEO-global +4.13 and Statistics +2.33; Unique Words negative in both regimes (-2.38). The intervention's sign flips with starting quality.

### 2.4 Supporting observations

- The intro-summary feature contributes positively (+0.004), a fourth (weak) data point for the lead-summary convergence chain.
- Visibility and quality genuinely trade off, and the trade-off severity is topic-dependent (education: visibility costs quality; food: nearly free).
- The paper's own conclusion: "LLM citation behavior is driven more by high-level discourse organization and information structure than by surface lexical cues."

## 3. Proposed updates to `aiseo-audit`

### 3.1 Add a starting-quality gate to the recommendations engine (this paper's main lesson)

Our recommendations currently fire whenever a factor scores below 70%, regardless of overall page polish. Per this paper, "add statistics / improve fluency / add quotes" advice is likely _harmful_ on already-polished pages and helpful on rough ones. Implementation: compute a polish proxy from signals we already have (readability score, sentence-length variance, boilerplate ratio, structural completeness); when the page classifies as polished, suppress or invert content-rewriting recommendations and say why ("this page is already fluent; further stylistic optimization measurably reduced visibility in controlled tests"). This is a change to `generateRecommendations` in `src/modules/recommendations/service.ts`, not to scoring, and is the cheapest way to encode the regime finding.

### 3.2 Stop recommending fluency improvements for readable pages

`readabilityForCompression` recommendations should fire only below a genuine readability floor. Above it, fluency emphasis showed negative marginal visibility. Keep readability measurement as a diagnostic (v2 plan already does); this paper adds the reason the _recommendation_ must be conditional, not just the score.

### 3.3 Sharpen the coverage-vs-density distinction in entity scoring

Three papers now separate the two: term/entity _presence and coverage_ helps (What Gets Cited causally; SAGEO structural alignment), repetition _intensity_ hurts (FeatGEO keyword focus; AutoGEO keyword stuffing). Replace `Entity Density` (per-100-words intensity) with entity _coverage_ checks (are the page's key entities present in structural fields and early body), and add an over-repetition warning band. This refines review #3's structural-alignment factor rather than adding a new one.

### 3.4 Evidence-density features for the citation-fitness stage

Within-bundle, statistics/sources/quotes density carried the most word-count visibility while formatting-only edits carry none for first-citation. For the v2 stage scores this suggests: grounding-signal measurements belong in the citation-fitness stage as _conditional_ contributors (regime- and domain-dependent), not deleted. Tier: `conditional`, with the C-SEO Bench citation-rank caveat attached to any recommendation that suggests _adding_ them.

### 3.5 Record the metric split in the traceability docs

The formatting tension (structure helps word-count visibility, does nothing for first-citation) means our docs should track two outcome columns per factor: "cited at all / cited first" and "share of answer once cited." Factors can legitimately differ across them, and collapsing the two is how the original GEO paper's numbers got over-claimed in the first place.

### What this paper does NOT justify changing

- Anything retrieval-side: candidate set is fixed; the authors state FeatGEO is conditional on retrieval. SAGEO Arena's warnings about content expansion diluting retrieval still bound any advice from this paper.
- Building NSGA-II-style optimization into the tool: it requires repeated engine calls per candidate page (the authors flag the compute cost). Probe-layer material only.
- Treating the ablation numbers as causal factor weights: they are marginal contributions within optimized bundles on one metric, with acknowledged interaction effects. Tier `heuristic` to `conditional`, never `supported`.
- Reviving statistics-addition as universal advice: the positive statistics results are word-count visibility on unpolished or optimized-bundle content; the citation-rank harm from C-SEO Bench is unrefuted in its own setting.
