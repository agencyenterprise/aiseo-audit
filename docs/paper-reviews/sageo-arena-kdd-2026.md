# Paper Review: SAGEO Arena (KDD 2026)

**Paper:** Sunghwan Kim, Wooseok Jeong, Serin Kim, Sangam Lee, Dongha Lee (Yonsei University, Konkuk University). "SAGEO Arena: A Realistic Environment for Evaluating Search-Augmented Generative Engine Optimization." KDD 2026, DOI 10.1145/3770855.3818146. [arXiv:2602.12187v2](https://arxiv.org/abs/2602.12187) (read in full, including appendices A through E). [Code and artifacts](https://github.com/happysnail06/SAGEO_Arena)

**Reviewed:** August 28, 2026, against `aiseo-audit` v1.6.2. Previous reviews: [C-SEO Bench](c-seo-bench-neurips-2025.md), [AutoGEO](autogeo-iclr-2026.md).

**What the paper does:** The first end-to-end test. Both prior papers handed documents directly to the LLM; this one builds the full pipeline a real generative engine uses: BM25 retrieval over 171,003 real crawled web documents (top 100 passages) → cross-encoder reranking (Qwen3-Reranker-4B, top 10 survive) → generation with citations (GPT-5-mini). 2,700 queries across nine domains (web search, general QA, multi-hop QA, biomedical, community QA, finance, debate, shopping, academic). Crucially, it **preserves structural fields** (title, meta description, headings, JSON-LD) as separately indexed signals, exactly the fields our tool audits, and it optimizes documents **without knowing the incoming query**, matching the real content-owner constraint and our tool's constraint. A target document is picked from the top-10, optimized, re-indexed, and the pipeline re-run to see whether it survives each stage.

**Evidence standard:** averages over 2,700 queries per cell, robustness checks across three retrievers (BM25, dense, hybrid), two rerankers, and two generators (GPT-5-mini, Claude Sonnet 4.6). No statistical significance tests are reported (like AutoGEO, unlike C-SEO Bench). Verification note: the figures our `EMERGING_RESEARCH.md` cites for this paper (+22% retrieval hit rate, +2.72 rank, 5.8% rank-10-to-11 dropouts, +28% StageAware, citation 0.50 to 0.58) all match the primary source.

---

## 1. Evidence that contradicts research our framework cites

This paper's contradictions target the _pipeline blindness_ of the research our framework is built on, including the two papers we reviewed before it.

| What we claim / implement                                                                                              | Where in our repo                                                                                                                      | What SAGEO Arena found                                                                                                                                                                                                                                                                                                                                                                                     | Paper evidence                 |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| GEO body-content methods (statistics, quotes, citations, fluency) as positive levers                                   | `docs/RESEARCH.md` Tier 2; `groundingSignals` factors                                                                                  | **Every body-text optimization degraded visibility at every stage**: retrieval hit rate -9% average, retrieval rank -4.54, reranking hit rate -16%, citation rate -6%. Adding technical terms cost -14% retrieval hit rate through lexical mismatch with query vocabulary. Robust across BM25, dense, and hybrid retrievers, both rerankers, and both generators.                                          | Table 2 (left), Tables 4 and 5 |
| AutoGEO's learned-rule rewriting as state of the art (our review #2; `EMERGING_RESEARCH.md` item 2)                    | [autogeo-iclr-2026.md](autogeo-iclr-2026.md)                                                                                           | **AutoGEO was the single worst strategy end-to-end**: -36% retrieval hit rate, -22.35 retrieval rank, -22% citation rate (and -38% with Claude as generator). Its lengthy rewrites dilute keyword density and drift from query vocabulary. AutoGEO's gains exist only in the fixed-context setting where retrieval is assumed. This is a direct cross-paper qualification of review #2's headline numbers. | Table 2, Table 5, Section 5.1  |
| Structured data audited as _presence and completeness_ (JSON-LD exists, recommended fields populated, OG tags counted) | `Structured Data` and `Schema Completeness` factors in `src/modules/authority-context/index.ts`; `Heading Hierarchy` counting H1/H2/H3 | The retrieval value of structural fields comes from their **content aligning with the body's key entities and terms**, not from their existence. The paper's winning moves rewrite a generic title ("Panel Clarifies Advice") into an entity-rich one ("IOM Panel Clarifies Vitamin D Guidance"). Our tool would score both titles identically.                                                            | Section 5.1, Table 2 (center)  |
| One undifferentiated readiness score                                                                                   | `computeScore` in `src/modules/scoring/service.ts` produces a single 0-100                                                             | **Stages reward opposite things.** Short keyword-dense documents won retrieval (LLaMA-optimized, 296 words average, 42.2% win rate) but collapsed at reranking (13.0%) and generation (7.0%), where substantive content won (GPT, 63.1% and 73.2%). A single score cannot represent a document that is retrieval-strong and generation-weak.                                                               | Figure 6, Section 5.2          |
| Universal factor applicability across content types                                                                    | All 7 categories applied identically                                                                                                   | **Shopping was the only domain where every optimization method decreased citation likelihood.** Third consecutive paper showing product content behaves differently (C-SEO Bench: only domain where methods worked; AutoGEO: 35-40% rule overlap; here: uniformly harmed).                                                                                                                                 | Figure 4, Section 5.2          |
| Combining more optimizations is better (implicit in our additive scoring: more factors satisfied = higher score)       | Score is a sum over all factors                                                                                                        | **"Both" (structural + body) scored worse than structural-only** at every stage: body-text harm partially cancels structural gains. All-in-One combinations also underperformed. More optimization is not monotonically better.                                                                                                                                                                            | Table 2 (right), Table 3       |

Alignment worth recording: our `Jargon Density` factor penalizes jargon, and this paper found Technical Terms cost -14% retrieval hit rate. That factor gets its first end-to-end supporting evidence.

## 2. What reproducibly increased LLM citations, how it was tested, and the results

This is the most actionable paper so far for a static auditing tool, because its winning intervention is query-blind and statically checkable.

### 2.1 Structural-field optimization (the paper's central positive result)

**How tested:** Apply each optimization strategy to only the structural fields (title, meta description, headings, JSON-LD), leave the body untouched, re-index, re-run the pipeline. The consistent mechanism: pack the fields with the body's key entities, numbers, and terms.

**Results (averages across strategies, Table 2 center; baseline retrieval H@20 = 0.58, citation rate = 0.50):**

| Stage      | Metric        | Change                         |
| ---------- | ------------- | ------------------------------ |
| Retrieval  | Hit rate H@20 | 0.58 → 0.71 (**+22%**)         |
| Retrieval  | Avg rank      | **+2.72 positions**            |
| Reranking  | Hit rate H@10 | -17% (the bottleneck, see 2.3) |
| Generation | Citation rate | 0.50 → 0.52 (+2%), rank +0.24  |

Best individual strategies at retrieval when applied to structural fields: Fluency +30% hit rate (+6.62 rank), Cite Sources +28% (+6.05), Statistics +29% (+6.03), Quotation +27% (+5.47). The same strategies that _hurt_ when applied to body text _help_ when applied to structural fields, because fields are where lexical query matching happens.

### 2.2 Stage-aware optimization (the paper's proposed method, best overall)

**How tested:** One prompt combining four principles: (1) mirror the body's key entities, numbers, and terms into title/meta/headings/JSON-LD, skipping fields already keyword-adequate; (2) fluent simple language, leaving already-clear text unchanged; (3) put the main claim at the very start of the body and make each claim self-contained; (4) reinforce core topic terms through the body and replace ambiguous pronouns with explicit subject names.

**Results (Table 3):** retrieval H@20 0.58 → 0.75 (**+28%**), retrieval rank **+4.86**, reranking rank change only -0.08 (best of all methods, effectively neutral at the bottleneck), **citation rate 0.50 → 0.58** with +1.01 citation rank. The only method that improved or held every stage.

### 2.3 Mechanistic findings that explain the numbers

- **The rank-10-to-11 cliff:** 5.8% of optimized documents fell from reranking position 10 to 11 and were thereby excluded from generation entirely. Visibility is not smooth; there is a hard cutoff, and any optimization that costs even one rerank position can zero out a page.
- **Answer prominence drives reranking:** case studies show the reranker rewards additions that address the query's informational need and placements of the direct answer in early paragraphs; restructuring that pushed the answer later caused large drops even when the answer was intact. Third independent paper converging on conclusion-first (C-SEO Bench's LLM Guidance, AutoGEO's Conclusion First rule, now reranker behavior).
- **Structural fields surface, body gets cited:** citation-source tracing (fuzzy-matching quoted spans back to document regions) shows the vast majority of citations originate in body text, while structural fields drive retrieval. Two roles, both necessary, neither substitutable.
- **Query-formulation fragility (Appendix C):** optimized documents lose visibility under query paraphrases, worst under abstraction, because optimization overfits the document's own vocabulary. Supports paraphrase-robustness testing in any query-aware audit.
- **Answer quality sanity check:** white-hat optimization of one document barely moves answer quality (88.9% → 87.3%), separating this from the adversarial regime.

## 3. Proposed updates to `aiseo-audit`

### 3.1 New factor: structural-field entity alignment (highest-value change from any paper so far)

The paper's +22%/+28% results come from one mechanism our tool completely misses: **do the title, meta description, headings, and JSON-LD contain the body's key entities, numbers, and terms?** We already have everything needed: entities via `extractEntities` (compromise NLP), all structural fields via cheerio, numeric extraction in grounding signals. Implementation: extract top-N body entities and salient terms, compute coverage in each structural field, score coverage rather than presence. This is deterministic, query-blind (matching the paper's own constraint), and directly implements the paper's validated mechanism. It should become a headline factor in `contentExtractability` or a new retrieval-alignment category, replacing count-based `Heading Hierarchy` scoring as the primary structural signal.

### 3.2 Restructure scoring into stage scores (this paper is the direct evidence)

The v2 stage architecture (technical eligibility / retrieval alignment / citation fitness) stops being a design preference and becomes the paper's core empirical finding: stages reward different, sometimes opposite, properties, with a hard cutoff between them. A single blended score mathematically cannot express "this page will be retrieved but not cited" or the reverse. Report copy should also explain the two-role model: structural fields get you retrieved, body content gets you cited.

### 3.3 Upgrade "Lead Summary / main claim first" to three-paper convergence

Now supported by: C-SEO Bench (LLM Guidance, the only significant content method), AutoGEO (Conclusion First rule on all three engines), and SAGEO Arena (reranker case study: early answer placement improves rank, displacement causes drops; StageAware principle 3). This factor graduates from `conditional` toward the strongest evidence tier a static factor can have. Implement per review #1, section 3.1.

### 3.4 New diagnostic: pronoun ambiguity / explicit subject references

StageAware principle 4 ("replace ambiguous pronouns with explicit subject references" to keep paragraphs topically connected) is statically checkable with the NLP stack we ship: flag paragraphs that open with pronoun subjects lacking a nearby explicit referent. New low-cost diagnostic in `entityClarity`, tiered `heuristic` (it is part of a winning bundle, not individually ablated).

### 3.5 Diff mode: warn on large content expansion

AutoGEO-style rewrites that substantially expand content were catastrophic at retrieval (-22.35 rank) by diluting keyword density. Our `--diff` mode already tracks pages over time: add a warning when word count grows substantially while title/heading entity coverage stays flat, flagging retrieval risk from content dilution. Also worth a README caution against LLM rewriting services that expand pages, citing this result.

### 3.6 Domain profiles: add the shopping warning

Three papers now show product content is different, and this one shows every tested optimization _hurt_ in shopping. The proposed `domain: "product"` profile should not just swap factors; for product pages the tool should lower confidence and explicitly warn that generic content optimization measurably reduced citation likelihood in the closest available end-to-end test.

### 3.7 Word Count Adequacy: annotate the stage tension

Short keyword-dense pages win retrieval (length normalization), substantive pages win reranking and generation. Our 300-3,000 word band is not validated by either side. Keep as a diagnostic; drop it from scoring, per the v2 plan.

### What this paper does NOT justify changing

- Claiming statistical significance: no significance tests are reported; effects are large and replicated across component swaps, but the evidence tier is `conditional`, not `supported` in the strict sense.
- Treating the +22%/+28% numbers as commercial-engine guarantees: the pipeline is realistic but reproduces neither proprietary ranking signals nor user-behavior signals (the authors say this in Appendix D).
- Removing body-content quality factors: body text is where citations come from (Section 5.2); the finding is against _rewriting_ body text for optimization, not against substantive body content.
- The specific k values (top-100, top-10): real engines differ; the rank-cliff concept transfers, the exact thresholds do not.
