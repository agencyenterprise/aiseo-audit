# Paper Review: IF-GEO (Findings of ACL 2026)

**Paper:** Heyang Zhou, Jiajia Chen, Xiaolu Chen, Jie Bao, Zhen Chen, Yong Liao (University of Science and Technology of China; Institute of Dataspace, Hefei). "IF-GEO: Conflict-Aware Instruction Fusion for Multi-Query Generative Engine Optimization." Findings of ACL 2026, pages 27576-27590, DOI 10.18653/v1/2026.findings-acl.1373. [ACL Anthology](https://aclanthology.org/2026.findings-acl.1373/) (read in full from the Anthology PDF, including Appendix A). [Code](https://github.com/yangjizc/IF-GEO)

**Reviewed:** August 28, 2026, against `aiseo-audit` v1.6.2. Previous reviews: [C-SEO Bench](c-seo-bench-neurips-2025.md), [AutoGEO](autogeo-iclr-2026.md), [SAGEO Arena](sageo-arena-kdd-2026.md), [What Gets Cited](what-gets-cited-sigir-2026.md), [FeatGEO](featgeo-acl-2026.md), [Mind Reader](mind-reader-acl-2026.md).

**What the paper does:** Asks what happens when one document must serve _many_ queries at once, which is every real page's situation. On a multi-query benchmark (GEO-Bench documents, each with a cluster of 5 related queries targeting distinct informational dimensions: definition, usage, pros/cons), it first _measures_ the conflict problem (Appendix A), then proposes IF-GEO: mine the latent queries a page should answer, generate per-query edit requests, detect where requests collide (same text span, incompatible directions, e.g. "simplify terminology" vs "add domain precision"), resolve or synthesize compromises, and execute one coordinated revision blueprint. It also introduces risk-aware stability metrics: Worst-Case Performance (largest single-query drop), Win-Tie Rate (fraction of queries not harmed), Downside Risk (squared negative gains).

**Evidence standard:** Position-Adjusted Word Count (the GEO metric family) plus LLM-judged subjective scores, GPT-4o-mini engine (Gemini 2.0 Flash as robustness check), 1,000 test queries for main results. No statistical significance testing. Everything in the pipeline is LLM calls. Retrieval is fixed. Verification note: our `EMERGING_RESEARCH.md` claims about this paper (single-document edits conflict across queries; stability metrics introduced; a page-level audit without a query set cannot evaluate this) all match the primary source.

---

## 1. Evidence that contradicts research our framework cites

The contradiction here is less about individual factors and more about what a _single number per page_ can represent.

| What we claim / implement                                                                                    | Where in our repo                                  | What IF-GEO found                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Paper evidence         |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| One score, one recommendation list per page, no notion of which queries the page serves                      | entire scoring path; `generateRecommendations`     | **Single-query optimization skews gains, measurably.** Over 200 documents and 808 query pairs: the tuned query gains +0.277 on average while sibling queries gain only +0.087, the negative-gain rate for sibling queries is 30.6% (2.5x the tuned query's 12.4%), and spillover is negative in 69.2% of pairs. A page that audits "improved" can simultaneously be losing on a third of the queries it actually serves, and our tool cannot see it.                                               | Appendix A, Table 4    |
| Mean-style aggregate as the quality signal (weighted category average → one 0-100 score)                     | `computeScore` in `src/modules/scoring/service.ts` | **Mean-based evaluation masks tail damage.** Every GEO heuristic has a positive mean gain here, yet regresses 27 to 39% of queries (Win-Tie Rates of 61 to 73%) with worst-case single-query drops of -0.08 to -0.13. The paper's whole metrology argument is that means conflate beneficial upside with harmful downside; variance does too (IF-GEO has _higher_ variance than baselines while having far better tail behavior).                                                                  | Table 2                |
| Recommendations treated as independent, compatible line items sorted by priority                             | `src/modules/recommendations/service.ts`           | **Revision requests conflict**, specifically when they target the same content with incompatible directions; the paper's canonical example is "simplify terminology for accessibility" vs "introduce domain-specific precision," a pair our tool can emit simultaneously today (`Jargon Density` says simplify; grounding/entity recommendations say add technical specificity). Removing conflict resolution is IF-GEO's single largest ablation drop (9.24 → 6.14, with the worst tail metrics). | Section 4.3.2, Table 3 |
| Lexical enrichment as a positive (`Entity Richness` vocabulary breadth framing; GEO's Unique Words heritage) | `docs/RESEARCH.md`                                 | Unique Words is _negative on the mean_ here (-0.79 objective, -0.39 subjective), the fifth independent benchmark where lexical enrichment measures at or below zero. It also has the worst Win-Tie Rate of all methods (61.04%).                                                                                                                                                                                                                                                                   | Tables 1 and 2         |

Consistent-with-prior-reviews note: evidence-oriented heuristics (Cite Sources +4.71, Quotation +4.23, Statistics +3.49) were the best of the fixed heuristics here, on human-written GEO-Bench content under the word-count metric family, exactly where the regime/metric chain from reviews #5 and #6 predicts they should look good. Auto-GEO again strong in this fixed-context, human-written setting (+7.59), again consistent with the reconciliation recorded in review #6.

## 2. What reproducibly increased LLM visibility, how it was tested, and the results

### 2.1 The conflict phenomenon itself (Appendix A, the most audit-relevant "test")

**How tested:** take a document with 5 sibling queries, optimize it for one query, measure gains on all five. 202 records, 808 tuned/sibling pairs.

**Result:** gain allocation skew, quantified (numbers in the table above). This is the paper's real contribution to _our_ problem: it demonstrates that "did the page improve?" is ill-posed without asking "for which queries?", and it provides the measurement design to answer it properly.

### 2.2 Conflict-aware coordination (the method result)

**How tested:** IF-GEO (query mining → per-query edit requests → dedup, prioritize, resolve conflicts → single blueprint-guided revision) vs nine GEO heuristics, RAID, and Auto-GEO, all on the same LLM (GPT-4o-mini), 1,000 queries.

**Results:** best mean gain (objective overall **+11.03** vs +7.59 for Auto-GEO, the best baseline) _and_ best tail profile: worst-case single-query drop **-0.009** (vs -0.051 Auto-GEO, -0.08 to -0.13 heuristics), Win-Tie Rate **80.5%**, Downside Risk roughly half of Auto-GEO's. Gains replicate on Gemini 2.0 Flash without retuning and are consistent across initial rank buckets (not just already-strong pages).

### 2.3 Component and scaling evidence

- **Ablations (Table 3):** removing conflict resolution costs the most (9.24 → 6.14) and produces the worst tails; removing instruction fusion most damages reliability (Win-Tie Rate 80.8% → 74.8%, Downside Risk doubles); removing the blueprint mainly lowers achievable gain. Coordination is not a nicety; it is where the value is.
- **Query expansion size:** mean gain rises monotonically with more mined queries (8.06 at N=1 → 10.02 at N=9), stability plateaus at N=5. Auditing against roughly five queries captures most of the multi-query picture.

### 2.4 Caveats

Word-count metric family, no significance tests, single primary engine, LLM-judged subjective scores, retrieval fixed, and the method is a multi-stage LLM pipeline (the authors flag token cost). As with Mind Reader, the transferable asset is the _problem formulation and metrics_, not the pipeline.

## 3. Proposed updates to `aiseo-audit`

### 3.1 Make the multi-query audit report stability, not just coverage (completes review #6's proposal)

Review #6 proposed repeatable `--query` with per-query alignment. This paper supplies the exact reporting semantics to adopt, all deterministic once the user provides N queries:

- **Per-query alignment scores** (term + aspect coverage per query).
- **Worst-case line** (WCP analog): "your weakest target query is X at 31% coverage."
- **Coverage rate** (WTR analog): "the page adequately serves 3 of 5 target queries."
- Default guidance of about **5 queries**, straight from the N=5 plateau finding.

The mean-masks-tails argument applies to our own aggregate too: whenever multiple queries are supplied, the headline result should be worst-case and coverage-rate first, mean second.

### 3.2 Diff mode: per-query regression detection

`--diff` currently tracks one overall score over time. With a query set in config, diff should report per-query deltas and flag any query whose alignment _dropped_, since Appendix A shows improving one query commonly degrades siblings (negative spillover in 69.2% of pairs). This turns our existing history feature into the regression detector the paper argues is necessary.

### 3.3 Conflict detection in the recommendations engine

Our recommendation builders can emit contradictory advice today (simplify jargon vs add technical specificity; shorten sections vs deepen coverage). Minimal deterministic fix: tag each builder in `RECOMMENDATION_BUILDERS` with a direction axis (`simplify|deepen`, `shorten|expand`, `add|remove`), and when opposing tags fire on the same page, emit a single combined item that names the tension and asks which audience/query set the page serves, instead of listing both sides as independent to-dos. This is the audit-tool translation of the paper's conflict-resolution stage, and the ablation says that stage is the most valuable one.

### 3.4 Content budget framing in report copy

The paper's premise is a "limited content budget": every addition competes with the rest of the page, and SAGEO Arena showed unbounded additions dilute retrieval. Recommendations that suggest adding content should stop implying additions are free; a one-line budget note in the report ("prioritize the top items; each addition competes for the same content budget") is cheap and evidence-aligned.

### 3.5 Probe-layer note: reverse query mining

IF-GEO's query-mining prompt ("act as a search analyst; infer the queries that should lead to this page, weighted by likelihood") is the natural LLM-assisted onramp for users who cannot supply a query set. Static fallback for the core tool: derive candidate queries from title, H1, and section headings. Record in the probe-layer design notes.

### What this paper does NOT justify changing

- Building the IF-GEO pipeline into the tool: multi-stage LLM workflow, token-heavy, probe-layer only.
- Retrieval-stage conclusions: retrieval fixed; SAGEO Arena's constraints still bound any content-addition advice.
- Treating +11.03 as a citation-rate gain: it is Position-Adjusted Word Count, the word-count metric family.
- Weighting evidence heuristics back up: their strong showing here is regime- and metric-consistent with prior reviews, not new causal support (C-SEO Bench's citation-rank harms remain unrefuted in their setting).
- Adopting the 5-query plateau as a hard rule: one benchmark, one engine; use it as a default suggestion, not a validated constant.
