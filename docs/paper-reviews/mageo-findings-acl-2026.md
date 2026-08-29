# Paper Review: MAGEO (Findings of ACL 2026)

**Paper:** Beining Wu, Fuyou Mao, Jiong Lin, Cheng Yang, Jiaxuan Lu, Yifu Guo, Siyu Zhang, Yifan Wu, Ying Huang, Fu Li (Hangzhou Dianzi University; Central South University; Shanghai AI Laboratory; Sun Yat-sen University; Ramus; HKUST Guangzhou). "From Experience to Skill: Multi-Agent Generative Engine Optimization via Reusable Strategy Learning." Findings of ACL 2026, pages 43305-43315, DOI 10.18653/v1/2026.findings-acl.2149. [ACL Anthology](https://aclanthology.org/2026.findings-acl.2149/) (read in full from the Anthology PDF). [Code](https://github.com/Wu-beining/MAGEO)

**Reviewed:** August 28, 2026, against `aiseo-audit` v1.6.2. Previous reviews: [C-SEO Bench](c-seo-bench-neurips-2025.md), [AutoGEO](autogeo-iclr-2026.md), [SAGEO Arena](sageo-arena-kdd-2026.md), [What Gets Cited](what-gets-cited-sigir-2026.md), [FeatGEO](featgeo-acl-2026.md), [Mind Reader](mind-reader-acl-2026.md), [IF-GEO](if-geo-findings-acl-2026.md).

**What the paper does:** Reframes GEO as strategy _learning_: four agents (Preference, Planner, Editor, Evaluator) iteratively edit a page, a fidelity gate rejects any variant that distorts the source, and editing patterns that worked are distilled into a Skill Bank of reusable, engine-and-scenario-indexed strategies. Three methodological contributions matter more to us than the system: (1) a **Twin-Branch protocol** (freeze the retrieval list, generate the answer with and without the optimized document, attribute the difference causally to the edit); (2) **DSV-CF**, a dual-axis metric unifying visibility with attribution accuracy and _penalizing miscitation_; (3) **MSME-GEO-Bench**, a multi-scenario benchmark (health, finance, education, consumption, daily life) with retrieval-validated query-document pairs. Engines tested: GPT-5.2, Gemini-3 Pro, Qwen-3 Max, the newest engine set in any paper reviewed so far.

**Evidence standard:** LLM-judged metrics, but uniquely in this series the judge is **validated against three human annotators** (Spearman 0.81 on the composite, 81.5% pairwise agreement), and the cost-effectiveness comparison includes paired t-tests (MAGEO vs the best heuristic, p < 1e-8). Retrieval is frozen by design, so retrieval-stage effects are out of scope. Verification note: our `EMERGING_RESEARCH.md` claims about this paper (engine-specific preference modeling and strategy reuse drive gains; audits should not reward visibility that causes misattribution) match the primary source.

---

## 1. Evidence that contradicts research our framework cites

| What we claim / implement                                                                                           | Where in our repo                                | What MAGEO found                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Paper evidence        |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| GEO heuristics as effective levers, still cited as "Tier 2: High Impact"                                            | `docs/RESEARCH.md`                               | **On the newest engines, the heuristics are dead or harmful.** On MSME-GEO-Bench with GPT-5.2, word-level visibility vs 1.00 baseline: Fluent 0.78, Unique Words 0.81, SEO/keyword optimize 0.87, Technical Terms 0.88, Statistics 0.92; the best (More Quotes) reaches only 1.33. Several actively reduce visibility, and keyword optimization "can trigger hallucination penalties." Sixth benchmark replication, now on GPT-5.2 and Gemini-3 Pro.                                               | Tables 1 and 3        |
| Additive scoring: satisfied factors sum to the score, recommendations sum to `expectedGain`                         | `computeScore`; `generateRecommendations`        | **Stacking does not add.** Combining the four best heuristics (quotes + technical terms + citing sources + authoritative) yields WLV 1.90, barely above the best single heuristic (1.33) and far below coordinated optimization (4.52). "Gains are not reducible to additive rule composition." The direct experimental refutation of sum-of-factors scoring.                                                                                                                                      | Table 5, Section 5.7  |
| Engine-agnostic scoring as a design principle ("engine-agnostic" in our package description)                        | `package.json` description; single weight vector | **Removing engine-specific preference modeling is the largest ablation drop**: WLV 4.52 → 2.08 on GPT-5.2 (and 5.30 → 2.40 on Gemini). "Knowing the judge is critical; generic high-quality writing is insufficient." The paper also names the qualitative differences: Gemini-3 Pro favors compact, highly structured evidence (bullet lists for medical advice), GPT-5.2 favors authority-seeking style with heavier citation formatting, Qwen-3 Max favors didactic, safety-aware organization. | Table 1, Section 5.4  |
| More optimization is monotonically better (implicit: our score has no upper regime; recommendations never say stop) | scoring and recommendations paths                | **Over-optimization fatigue:** iterative editing peaks around round 5, then further edits give diminishing returns and "can even slightly reduce faithfulness." Third convergent result (with FeatGEO's regime saturation and SAGEO's dilution) that optimization has a peak, not an asymptote.                                                                                                                                                                                                    | Figure 4, Section 5.5 |
| Visibility as the only implicit objective of the audit                                                              | report framing throughout                        | **Visibility without fidelity is a failure mode the field now measures.** DSV-CF explicitly penalizes citation errors; MAGEO's gains came with a _falling_ false-citation ratio (0.058 → 0.043), while keyword-forcing methods raised hallucination penalties. Our tool has no concept that an optimization can succeed at visibility while causing the engine to misattribute or distort the source.                                                                                              | Section 5.3, Table 4  |

## 2. What reproducibly increased LLM visibility, how it was tested, and the results

### 2.1 Coordinated, engine-aware, fidelity-gated optimization (the system result)

**How tested:** Twin-Branch protocol (frozen retrieval list, swap the target document for its optimized variant, regenerate, diff the outcome) on two benchmarks and three engines, with an LLM judge validated against humans.

**Results (word-level visibility vs 1.00 unoptimized):** GPT-5.2 **4.52**, Gemini-3 Pro **5.30**, Qwen-3 Max **3.84**, versus at most 1.33 for any single heuristic and 1.90 for the best four-heuristic stack. Fidelity did not pay for it: response faithfulness _rose_ (8.17 vs 7.05 baseline on GPT-5.2) and the false-citation ratio fell. Paired t-tests: MAGEO variants beat the best heuristic at p < 1e-8. A cost-reduced "Lite" variant captures most of the gain (WLV 3.95 at 2.9x baseline tokens vs 4.52 at 4.0x).

### 2.2 The ablation hierarchy

| Component removed                   | WLV on GPT-5.2 (from 4.52) |
| ----------------------------------- | -------------------------- |
| Engine-specific preference modeling | 2.08 (largest drop)        |
| Skill Bank (reusable strategies)    | 1.41                       |

Engine awareness is worth more than everything else in the system. Reusable strategy memory is second. Both matter far more than any specific edit type.

### 2.3 Methodological assets (more valuable to us than the numbers)

- **Twin-Branch protocol:** the cleanest published design for causally measuring "did this page edit change the answer" in a black-box engine: freeze retrieval, substitute the document, diff. This is exactly the experiment our future probe layer should run.
- **DSV-CF:** a worked example of scoring visibility and attribution fidelity together, with a tunable miscitation penalty. Sub-metrics: word-level visibility, positional authority, citation prominence, subjective impression (visibility axis); attribution accuracy, faithfulness, key-point coverage, answer dominance (fidelity axis).
- **Judge validation:** Spearman 0.81 against humans shows LLM-as-judge is usable for this class of measurement if audited with sampled human checks, which de-risks the probe-layer design.

### 2.4 Caveats

Multi-agent LLM pipeline (8.9k to 12.4k tokens per query), frozen retrieval (SAGEO Arena's retrieval warnings still apply to any content this pipeline produces), benchmark partially constructed by Gemini-3 Pro (acknowledged self-bias risk), Skill Bank generalization to unseen scenarios not formally analyzed (authors' own limitation list).

## 3. Proposed updates to `aiseo-audit`

### 3.1 Adopt Twin-Branch + DSV-CF as the probe-layer specification

The v2 plan's optional probe layer has so far been described loosely ("run queries, record citations, report with confidence intervals"). This paper supplies the concrete design to adopt: frozen-candidate twin-branch runs for causal attribution, and a dual-axis outcome (was the page cited and prominent; was the citation _accurate to the page_) with a miscitation penalty. Write this into the probe-layer design doc as the reference protocol, with sampled human audits per the judge-validation result.

### 3.2 Ship engine profiles with documented starting points

The engine-preference ablation (4.52 → 2.08) is the strongest quantitative case in the series for per-engine weighting, and the paper's qualitative profiles give us defensible initial presets: a Gemini profile weighting compact structure and lists higher, a GPT profile weighting citation formatting and authority signals, an open-model profile weighting didactic organization. Tier `heuristic` (qualitative observations, one paper), surfaced as `--engine <profile>` overlays on the shared core, consistent with AutoGEO's 79 to 84% rule overlap (review #2) which says the core stays shared.

### 3.3 Add an over-optimization stop signal to diff mode and recommendations

Three papers now show optimization has a peak: fatigue after ~5 rounds (here), regime saturation on fluent pages (FeatGEO), retrieval dilution from expansion (SAGEO). Concrete changes: (a) `--diff` history should flag plateau/decline across successive audits of the same URL ("score has not improved in 3 runs; further optimization is more likely to hurt than help"); (b) recommendations output should advise applying the top few items and re-measuring, instead of presenting the full list as a to-do list, which the stacking result (1.90 vs 4.52) shows is the wrong mental model anyway.

### 3.4 Stop presenting recommendations as additive (final nail)

Review #4 proposed gatekeeper/differentiator semantics; this paper adds the stacking experiment: applying the four best heuristics together yields 1.90x, not the naive product or sum. `expectedGain` should be renamed to audit points (per review #1) _and_ the report should drop any implication that completing all recommendations compounds. One sentence in the report template fixes this.

### 3.5 Add a fidelity note to content-addition recommendations

Any recommendation that suggests adding statistics, quotes, or citations should carry the constraint the fidelity gate encodes: additions must be real, verifiable, and consistent with the page's claims, because engines now measurably penalize forced or fabricated evidence (hallucination penalties for keyword forcing; falling false-citation ratio as the _goal_, not a side effect). This is recommendation copy in `src/modules/recommendations/constants.ts`, zero scoring changes.

### What this paper does NOT justify changing

- Building multi-agent optimization into the tool: 3 to 4x token overhead per page, probe/service layer only.
- Retrieval-stage anything: retrieval is frozen throughout; SAGEO Arena remains the only end-to-end evidence.
- Treating the engine profiles as validated weights: the preference descriptions are qualitative observations from one paper's Preference Agent; presets should be labeled experimental.
- Static fidelity checking in the core audit: attribution accuracy requires generating and reading answers; the core tool can only carry the _framing_ (3.5), not the measurement.
- Reading MSME-GEO-Bench numbers as neutral ground truth: the benchmark was partially constructed with Gemini-3 Pro, an acknowledged bias risk.
