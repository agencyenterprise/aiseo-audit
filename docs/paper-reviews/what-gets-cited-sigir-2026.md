# Paper Review: What Gets Cited (SIGIR 2026)

**Paper:** Rahul Vishwakarma, Shushant Kumar, Ratnesh Jamidar (Sprinklr). "What Gets Cited: Competitive GEO in AI Answer Engines." SIGIR 2026, DOI 10.1145/3805712.3808445. [arXiv:2605.25517v1](https://arxiv.org/abs/2605.25517) (read in full).

**Reviewed:** August 28, 2026, against `aiseo-audit` v1.6.2. Previous reviews: [C-SEO Bench](c-seo-bench-neurips-2025.md), [AutoGEO](autogeo-iclr-2026.md), [SAGEO Arena](sageo-arena-kdd-2026.md).

**What the paper does:** The only per-factor causal study in this series. Instead of rewriting whole documents, it builds matched pairs that differ in **exactly one** of 18 content factors (facts, prices, specs, and length held equal within 5%), injects exactly two candidates into a simulated RAG context, and records which one the model cites _first_. 252,000 trials across six LLMs (Gemini 2.5 Flash, Claude 3.5 Sonnet, Kimi K2 Thinking, GPT-5 Nano, GPT-5 Mini, GPT-5.2): 100 brand-anonymized product review articles across 50 B2C categories, 1,440 scenarios, 3 query paraphrases each, both source orders, 5 repeats. Outcomes are modeled with logistic mixed-effects models (nested random effects for scenario and scenario-order, position covariate controlled, lme4, p<0.05).

**Evidence standard:** This is the strongest causal design of the four papers so far: single-factor isolation, order counterbalancing, brand anonymization, pseudoreplication-aware statistics. Its scope is correspondingly narrow: product-review content only, two-document slates only, first-citation outcome only, retrieval bypassed entirely (sources are injected). Some extreme odds ratios carry convergence warnings (quasi-separation reported as ">10k" means "near-deterministic win," not a precise number). Verification note: every claim our `EMERGING_RESEARCH.md` makes about this paper matches the primary source.

---

## 1. Evidence that contradicts research our framework cites

| What we claim / implement                                                                                                                                                                                        | Where in our repo                                                                                                                               | What this paper found                                                                                                                                                                                                                                                                                                                                                                                                                   | Paper evidence                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| A page with an old date outscores a page with no date. `Publication Date` awards 8 pts for any parseable date; `Content Freshness` gives 0 pts for no date. Net: 2019-dated page gets 8 pts, undated page gets 0 | `src/modules/authority-context/index.ts` (Publication Date and Content Freshness factors)                                                       | **Inverted.** "No vs Old Timestamp" favors _no timestamp_ (OR 1.31 to 2.32 across models): an undated page is _more_ likely to be cited first than one displaying a stale 2019 date. Meanwhile "Recent vs No" is weak and inconsistent (significant in only 2 to 3 of 6 models). The citation-relevant signal is _visible staleness_, not date absence. Our scoring rewards exactly the wrong page.                                     | Table 2, freshness rows; Section 3 |
| Lists, tables, structure, and scannability as citation levers (53 pts of `contentStructure`; RESEARCH.md Tier 3: "Lists and Tables - easiest content formats for AI to extract verbatim")                        | `src/modules/content-structure/index.ts`; `docs/RESEARCH.md`                                                                                    | **Formatting had no causal effect.** "Structured vs Dense": no consistent effect, ORs 0.78 to 1.68 with several _below 1_. "Organized vs Scattered": weak and model-dependent (1.13 to 3.87). The authors: "LLMs parse content regardless of visual organization... formatting changes showed minimal return and can be deprioritized." Third convergent null on formatting (C-SEO Bench, SAGEO Arena body-only, now causal isolation). | Table 2; Sections 3, 4             |
| Search Engine Land correlational claims (72.4% answer capsules, +140% answer-first, 120-180 word sections) presented as "the data"                                                                               | `docs/RESEARCH.md` "What Gets Cited: The Data" section (note: our doc section coincidentally shares this paper's title but cites a vendor blog) | When formatting is isolated causally with facts held constant, it does nothing. The correlational patterns in vendor studies are most plausibly explained by confounding: pages with capsules also differ in relevance, completeness, and freshness. This paper is the controlled test those claims never had.                                                                                                                          | Table 2, formatting rows           |
| Freshness scored in universal month bands (12 pts: ≤6mo, ≤12mo, ≤24mo)                                                                                                                                           | `src/modules/authority-context/index.ts` freshness brackets                                                                                     | Only two date levels were tested: 2026 vs 2019. "Recent vs Old" is a unanimous gatekeeper, but **nothing in the design supports graduated month bands**, and the paper explicitly cautions the estimates are pairwise preferences in product content. Our 6/12/24-month brackets remain invented.                                                                                                                                       | Section 2.1, Table 2               |
| Social proof, value proposition strength as implied authority signals (RESEARCH.md Tier 4 vicinity)                                                                                                              | `docs/RESEARCH.md`                                                                                                                              | Weaker Social Proof and Weaker Value Proposition reached significance in only 2 to 3 of 6 models: no cross-model consensus.                                                                                                                                                                                                                                                                                                             | Section 3                          |
| Neutral tone as a universal engine preference (AutoGEO review, section 2.2)                                                                                                                                      | [autogeo-iclr-2026.md](autogeo-iclr-2026.md)                                                                                                    | Nuanced, not contradicted: "Neutral vs Promotional" was significant in only 2 to 3 of 6 models (weak), while "Confident vs Hedged" strongly favored _confident_ language (OR 599 and 754 on Gemini and Claude; 2.67 to 10.6 elsewhere). Engines punish **uncertainty qualifiers** far more reliably than they punish salesy tone. The two rules compose: confident, evidence-backed, non-promotional.                                   | Table 2                            |

## 2. What reproducibly increased LLM citations, how it was tested, and the results

This paper's hierarchy is the cleanest causal ranking available anywhere in the GEO literature. All effects below are odds ratios of being cited first, after controlling for presentation order.

### 2.1 The four gatekeepers (significant in all 6 models, OR > 100, near-deterministic)

| Factor                                       | Effect range     | Meaning                                                                                                  |
| -------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| **On-topic vs off-topic**                    | OR 221 to >10k   | Content matching the query's actual subject wins almost always                                           |
| **Position 1 vs 2 in context**               | OR 1,795 to >10k | Confirms C-SEO Bench and SAGEO Arena position dominance, now causally isolated at the two-document scale |
| **Price present vs absent** (product domain) | OR 6.26 to >10k  | Explicit price information is a gatekeeper for product content                                           |
| **Recent (2026) vs old (2019) timestamp**    | OR 14.4 to >10k  | Visible staleness against a fresh competitor is close to disqualifying                                   |

The paper's framing: failing any gatekeeper can eliminate citation odds regardless of other strengths. Gatekeepers are not additive with the rest; they gate.

### 2.2 The seven differentiators (significant in 4+ of 6 models, OR roughly 2 to 243)

| Factor                                | Effect range | Our nearest factor                        |
| ------------------------------------- | ------------ | ----------------------------------------- |
| Query terms present vs missing        | 5.99 to 40.0 | none (no query input yet)                 |
| Specs present vs absent               | 8.63 to >10k | none (no product profile)                 |
| Deep vs shallow coverage              | 3.98 to >10k | `Word Count Adequacy` (a bad proxy)       |
| Evidence-backed vs unsupported claims | 2.09 to >10k | `Attribution Indicators` (pattern counts) |
| Confident vs hedged language          | 2.67 to 754  | none                                      |
| Consistent vs contradictory           | 1.74 to 4.09 | none                                      |
| With vs without comparisons           | 1.61 to 7.45 | none                                      |

### 2.3 The null and inconsistent set (7 of 18 factors)

No consistent effect: Content Structure (structured vs dense), Scattered Information. Significant in only 2 to 3 models: Overly Promotional, Weaker Value Proposition, Weaker Social Proof, No vs Old Timestamp, Recent vs No Timestamp.

### 2.4 Model behavior notes

All six models agreed on the four gatekeepers, suggesting universal drivers. Sensitivity varied widely otherwise: Kimi K2 responded to 83% of factors, Gemini to 33%; Gemini and Claude behaved categorically (most of their significant effects were near-deterministic). The GPT family behaved consistently across Nano/Mini/5.2 scales, suggesting citation behavior tracks architecture, not size. Practical upshot: an engine-agnostic audit can stand on the gatekeepers, but differentiator weights genuinely vary by engine.

## 3. Proposed updates to `aiseo-audit`

### 3.1 Fix the freshness inversion (bug-level priority)

Concrete change in `src/modules/authority-context/index.ts`:

- Stop treating "no parseable date" as the worst freshness state. Evidence ordering in product content: recent date > no date > stale date.
- `Publication Date` should not award presence points independent of the date's value; a visible stale date should score _below_ a missing date, not 8 points above it.
- Replace month bands with a two-level model (recent vs visibly stale) plus a domain condition, and mark freshness `neutral` (excluded from the denominator, per the v2 denominator fix) outside time-sensitive domains.
- Recommendation copy gains a genuinely new, evidence-backed instruction: "Do not display stale dates. Update the date only when content is actually refreshed; a stale visible date measurably hurts more than no date."

### 3.2 New factor: hedged-language density

The most implementable novel finding. Hedge qualifiers (might, possibly, could, perhaps, may, "what could be around") reduced first-citation odds in 5+ models, with enormous effects on Gemini and Claude. A wordlist plus per-sentence density is trivially deterministic and fits `readabilityForCompression` or a trust grouping. Tier `conditional` (product-domain evidence). Pairs with the existing recommendation rewrite: claims should be confident _and_ evidence-adjacent, not hedged.

### 3.3 Product profile gets causal content: price, specs, comparisons

Reviews #2 and #3 motivated a `domain: "product"` profile; this paper supplies its checklist with effect sizes: price presence (gatekeeper), technical specifications (differentiator), comparison content (weak differentiator). All statically detectable (price patterns, `offers`/`price` in JSON-LD, spec-table patterns, comparison language). This turns the product profile from "different warnings" into "different checks."

### 3.4 Demote formatting factors with a now-causal citation

The v2 plan already demotes `Lists Presence`, `Tables Presence`, `Paragraph Structure`, `Scannability`, and `Section Length` to diagnostics. This paper upgrades the justification from "no support found" to "causally isolated and null." The review-facing note should cite this paper directly, since it is the strongest single piece of evidence in the demotion argument.

### 3.5 Query-term coverage earns causal backing

The planned `--query` input's core check (query terms present in content) now has a causal effect size (OR 5.99 to 40.0). Combined with SAGEO Arena's structural-field result, the retrieval-alignment design writes itself: query terms in structural fields (retrieval, SAGEO) and in body content (citation, this paper), reported as separate stage signals.

### 3.6 Adopt the gatekeeper/differentiator structure in scoring

The paper's central architectural lesson matches SAGEO Arena's cliff finding from the other direction: some factors gate (topic match, staleness, position, price-in-product), others differentiate. A weighted sum misrepresents gates. The citation-fitness stage score should evaluate gatekeepers as pass/fail conditions that cap the score, with differentiators contributing points beneath the cap. This is a concrete scoring semantics for the v2 stage architecture rather than a new idea.

### 3.7 Reframe grounding factors from counts to claim-adjacency

"Evidence vs No Evidence" is a differentiator, but what was tested is _claims carrying supporting evidence_, not the count of citation markers. Our `Attribution Indicators` and `Numeric Claims` should evolve toward measuring evidence adjacent to claims (sentence-level co-occurrence of claim patterns and evidence patterns), which the existing pattern machinery in `src/modules/grounding-signals/patterns.ts` can support.

### What this paper does NOT justify changing

- Generalizing beyond product content: every scenario is a product review. The gatekeeper status of _price_ is explicitly domain-specific, and even topic match and freshness magnitudes may differ in informational domains.
- Anything retrieval-side: sources are injected; retrieval is bypassed. (SAGEO Arena covers that stage.)
- Multi-document dynamics: two-document slates only; the authors note real pools of 5 to 10+ documents were out of scope.
- Brand/domain authority conclusions: brands were deliberately anonymized, so this paper is silent on authority signals (our `authorityContext` category is neither supported nor contradicted).
- Internal-contradiction detection as a scored factor: real effect (OR 1.74 to 4.09), but detecting contradictions statically is beyond a deterministic tool; belongs in the probe layer notes, not the core audit.
