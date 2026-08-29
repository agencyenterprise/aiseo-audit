# Paper Review: AutoGEO (ICLR 2026)

**Paper:** Yujiang Wu, Shanshan Zhong, Yubin Kim, Chenyan Xiong (Carnegie Mellon University, Vody). "What Generative Search Engines Like and How to Optimize Web Content Cooperatively." ICLR 2026. [arXiv:2510.11438v1](https://arxiv.org/abs/2510.11438) (read in full, including Appendix A rule sets). [Code](https://github.com/cxcscmu/AutoGEO)

**Reviewed:** August 28, 2026, against `aiseo-audit` v1.6.2. Previous review in this series: [C-SEO Bench](c-seo-bench-neurips-2025.md).

**What the paper does:** Instead of hand-designing content rules, AutoGEO _learns_ what generative engines prefer. For each query it takes the highest-visibility and lowest-visibility documents among the retrieved candidates, asks an LLM to explain the difference, distills tens of thousands of these explanations into a compact rule set, and then uses the rules two ways: as a rewriting prompt for a frontier model (AutoGEO API) and as reward signals to train a tiny 1.7B rewriting model with reinforcement learning (AutoGEO Mini). Tested on three datasets (GEO-Bench, 1,000 test queries; a new E-commerce set, 416 test queries; a new Researchy-GEO set, 1,000 test queries; 5 retrieved candidate documents per query from ClueWeb22) against generative engines built on Gemini 2.5 Flash Lite, GPT-4o-mini, and Claude 3 Haiku.

**Metric warning, read first:** AutoGEO measures visibility with the **original GEO paper's word-count and position-adjusted word-count metrics** (how much of the answer is attributed to your document), _not_ the citation-rank metric C-SEO Bench used. C-SEO Bench argued this exact metric does not measure LLM citation preference. The paper reports **no statistical significance tests** (no p-values anywhere; contrast with C-SEO Bench's corrected Wilcoxon tests). Its evidence is "large, consistent effects across 3 engines x 3 datasets," which is meaningful but a weaker standard. Both facts scope everything below.

---

## 1. Evidence that contradicts research our framework cites

This paper is friendlier to the GEO tradition than C-SEO Bench, but it contradicts our framework's _architecture_ more than any individual factor.

| What we claim / implement                                                                                                            | Where in our repo                                                            | What AutoGEO found                                                                                                                                                                                                                                                                                                                                          | Paper evidence                      |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| One engine-agnostic rule set and weight vector for all pages ("engine-agnostic, deterministic" positioning; single `weights` config) | README description; `CategoryWeightSchema` in `src/modules/config/schema.ts` | **Engine-specific rules consistently beat a single global rule set**, and transferred rule sets underperform engine-native ones (Fig. 2c,d). Rule overlap between engines on the same data is 79 to 84%, so most rules are shared, but the best performance always requires engine-specific tailoring.                                                      | Section 5.3, Figure 2               |
| One set of factors and thresholds for all content types                                                                              | All seven categories apply identically to every page                         | **Domain matters more than engine.** Rule overlap between the two open-domain datasets is 88.24%, but E-commerce overlaps open-domain rules by only 34.78 to 40%. E-commerce engines reward model numbers, specs, pros/cons reasoning, and step-by-step guidance; open-domain engines reward how/why depth, balanced viewpoints, and neutral tone.          | Section 5.3, Table 5, Tables 7 to 9 |
| Entity/keyword density scored as positive (`Entity Density` factor, up to 15 pts)                                                    | `src/modules/entity-clarity/index.ts`                                        | **Keyword Stuffing baseline _decreased_ visibility on GEO-Bench** (18.05 vs 19.44 vanilla) and barely moved elsewhere. Unique Words was flat to negative on GEO-Bench (19.21 vs 19.44). Density-style optimization does not pay on any tested engine.                                                                                                       | Table 1                             |
| External links scored monotonically (6+ links = full points on `External References`, 13 pts)                                        | `src/modules/grounding-signals/index.ts`                                     | A recurring learned rule is **Self-Contained**: "present information as a self-contained unit, not requiring external links for core understanding." Citing sources is also a learned rule, so links as attribution are good, but our factor counts links, not attribution. A page needing links to be understood is what engines dislike.                  | Appendix A, Tables 7 to 9           |
| The GEO paper's 30-40% method numbers as settled fact                                                                                | `docs/RESEARCH.md` key findings table                                        | Mixed re-test on the GEO metric itself: Fluency was the best baseline (+22% relative on GEO-Bench, 23.73 vs 19.44) and Quotation helped, but **Statistics Addition was flat on GEO-Bench** (19.85 vs 19.44) and Cite Sources modest (21.47). Even on the friendly metric, the fixed methods are inconsistent, and all are crushed by learned rules (34.92). | Table 1                             |
| Persuasive/authoritative tone as a virtue (GEO heritage; our Tier 2 framing)                                                         | `docs/RESEARCH.md` Tier 2                                                    | Engines _learned-prefer the opposite_: **Neutral Tone** ("avoid promotional language, personal opinions, bias") is a common rule on Gemini, GPT, and Claude for research-style content.                                                                                                                                                                     | Appendix A, Table 9                 |

Note the tension between papers rather than pretending it away: on the word-count metric (this paper), fluency and quotations help; on citation rank (C-SEO Bench), nothing content-side reliably helps and statistics hurt. Both can be true: an engine may _say more about_ a fluent document without citing it _earlier_. Our tool should not cite either paper's numbers without naming the metric.

## 2. What reproducibly increased LLM visibility, how it was tested, and the results

### 2.1 Rule-guided rewriting (the headline result)

**How tested:** Rewrite the target document with the learned rule set embedded in the prompt (AutoGEO API, using Gemini 2.5 Pro as the rewriter), replace the original among the 5 retrieved candidates, regenerate the answer, and measure visibility. Repeated across 3 datasets x 3 engines. No significance testing; effects are large and directionally consistent in all 9 cells.

**Results (Overall visibility metric, vanilla → AutoGEO API):**

| Engine         | E-commerce        | GEO-Bench                       | Researchy-GEO     |
| -------------- | ----------------- | ------------------------------- | ----------------- |
| Gemini         | 18.32 → **34.05** | 19.44 → **34.92**               | 20.18 → **43.76** |
| GPT-4o-mini    | 18.27 → **30.58** | 20.74 → **26.73**               | 19.49 → **35.48** |
| Claude 3 Haiku | 20.73 → **23.48** | 19.34 → 22.25 (Mini: **26.42**) | 20.18 → **30.51** |

The paper's summary number is a 35.99% average improvement across GEO metrics. Generative-engine utility (answer precision, recall, clarity, insight) stayed flat or improved, unlike the adversarial baselines (hijack/poisoning), which raised visibility but degraded answer quality. On the hardest cases (lowest-visibility documents), AutoGEO API took Overall from 9.46 to 35.83 where the best fixed method (Fluency) managed only 16.78.

**What this is evidence for:** adaptive, engine-and-domain-specific content optimization works on the visibility metric, and it works _while preserving answer quality_. It is not per-factor causal evidence; the rewrite changes many things at once.

### 2.2 The learned rules themselves (the transferable asset)

Appendix A publishes the full rule sets. The per-rule ablation (Fig. 3) found **every individual rule produced measurable gains on the Gemini engine, and the full set beat any single rule** (figure-only result, no numbers in text, one engine). These rules are the closest thing this paper offers to "deterministic tests," because most are statically checkable properties of a page. The rules that appear on **all three engines** for research-style content:

1. **Conclusion First**: "State the key conclusion at the beginning of the document." Independently converges with C-SEO Bench's LLM Guidance result (the only content method that worked there). Two papers, different methods, same recommendation.
2. **Source Citation**: attribute factual claims to credible sources.
3. **Comprehensive**: cover key aspects and sub-topics.
4. **Factual Accuracy / internal consistency**.
5. **Topic Focus**: remove tangential info, navigation, and ads from the content.
6. **Neutral Tone**: no promotional language or bias.
7. **Balanced View** on debatable topics.
8. **Self-Contained**: understandable without following external links.
9. **In-Depth**: explain how and why, not just what.
10. **Logical Structure**: headings, lists, tables (Claude's variant says explicitly "to facilitate machine parsing").
11. **Specific Evidence**: data, statistics, named examples _in support of claims_ (contrast with mechanically appending statistics, which C-SEO Bench showed hurts).
12. **Clear Language**: define jargon on first use.
13. **Up-to-date** information.
14. **Actionable** steps for procedural topics.

Rules on two of three engines: **Accessibility** ("full text programmatically accessible, no logins, paywalls, or user interaction"; GPT and Claude). Engine-unique rules: Writing Quality (Gemini), purely Informational Purpose (GPT), Single Idea per paragraph (Claude).

E-commerce-specific rules (mostly absent from open-domain): model numbers and technical specifications, pros and cons reasoning, step-by-step recommendations, modular self-contained units, term definitions.

### 2.3 Negative and null results worth keeping

- Keyword Stuffing: below vanilla on GEO-Bench (18.05 vs 19.44). Even on the generous metric, stuffing loses.
- Statistics Addition: flat on GEO-Bench (19.85), positive only on E-commerce and Researchy, echoing C-SEO Bench's domain sensitivity in the least damaging light available.
- Adversarial methods (hijack, poisoning): visibility up, answer quality down across the board (Table 4). Optimization that degrades the answer is detectable and distinct from cooperative optimization.

## 3. Proposed updates to `aiseo-audit`

### 3.1 Upgrade the "Lead Summary / Conclusion First" factor to convergent evidence

Review #1 proposed a Lead Summary factor from a single narrow result. This paper's "Conclusion First" rule appears on **all three engines and all three datasets**, and its per-rule ablation showed gains. Two independent papers now support it. Implement the factor (does the first content block state the page's main conclusion/answer?) and tier it `conditional` with two citations rather than one. Detection: existing capsule machinery in `src/modules/answerability/capsules.ts` generalized to the document level (first paragraph after H1, before any H2).

### 3.2 Add a "Promotional Tone" diagnostic (new, statically checkable)

Neutral tone is a common learned rule on every engine and directly opposes the "Authoritative/persuasive" advice inherited from the GEO paper. Add a pattern-based detector (superlatives without evidence, "best ever", "revolutionary", exclamation density, first-person sales language, CTA phrases) as an unscored or lightly scored diagnostic in `groundingSignals` or a new provenance grouping. This is a genuinely new check the tool lacks entirely.

### 3.3 Add a paywall/accessibility check

"Full text accessible without logins, paywalls, or user interaction" is a learned rule on GPT and Claude engines. We already fetch the page; add detection of `isAccessibleForFree: false` in JSON-LD, common paywall markers, and truncated-content patterns to `contentExtractability`. High confidence, cheap, and squarely within the tool's technical-eligibility mission.

### 3.4 Introduce domain profiles (strongest architectural implication)

The 34.78 to 40% rule overlap between E-commerce and open-domain content is the paper's clearest structural finding. Concretely: a `domain: "product" | "informational"` config/CLI option that swaps which factors apply. Product profile: specs and model numbers present, pros/cons patterns, step-by-step blocks. Informational profile: how/why explanatory depth, balanced-view markers, neutral tone weighted higher. This is the same `domain` option proposed in the v2 plan, now with concrete per-domain factor lists drawn from Table 5 and Table 7.

### 3.5 Recalibrate `Entity Density` and `External References`

- Keyword stuffing measurably reduced visibility, and our `Entity Density` factor's scoring can reward density for its own sake. Cap it or convert to a diagnostic with an explicit over-optimization warning band (very high density scores _worse_, not neutral).
- `External References` should measure _attribution_ (links attached to claims) rather than raw link count, and stop treating more-links-is-better as the goal, reflecting the Source Citation + Self-Contained rule pair.

### 3.6 Docs: name the metric when citing numbers

`docs/RESEARCH.md` should state which metric backs each cited effect (word-count visibility vs citation rank), because the two papers reviewed so far disagree precisely along that line. AutoGEO's 35.99% belongs in the word-count column with a note that no significance tests were reported.

### What this paper does NOT justify changing

- Retrieval-stage factors: all candidate documents are already retrieved (5 per query, dense retrieval). Generation-stage only, same blind spot as C-SEO Bench.
- Building an LLM rewriter into the audit tool: AutoGEO is a rewriting system requiring engine access and training; it belongs in the optional probe/adapter layer discussed for v2.1, not in the deterministic core.
- Per-engine scoring weights as a _default_: engine rule overlap is 79 to 84%, so a shared core rule set is defensible; engine profiles are a refinement, not a rewrite.
- Treating the learned rules as causally validated factors: the rule ablation is one engine, figure-only, no significance testing. Rules earn `conditional` or `heuristic` tiers, not `supported`.
