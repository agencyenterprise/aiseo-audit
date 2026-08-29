# Paper Review: C-SEO Bench (NeurIPS 2025)

**Paper:** Haritz Puerto, Martin Gubri, Tommaso Green, Seong Joon Oh, Sangdoo Yun. "C-SEO Bench: Does Conversational SEO Work?" NeurIPS 2025 Datasets and Benchmarks Track. [arXiv:2506.11097v3](https://arxiv.org/abs/2506.11097) (read in full, v3, October 20, 2025). [Code](https://github.com/parameterlab/c-seo-bench) | [Data](https://huggingface.co/datasets/parameterlab/c-seo-bench)

**Reviewed:** August 28, 2026, against `aiseo-audit` v1.6.2.

**What the paper does:** Takes the nine content-rewriting methods from the foundational GEO paper (Aggarwal et al., KDD 2024), the paper our README and `docs/RESEARCH.md` cite as the basis for our scoring, plus two new methods, and re-tests all of them on a benchmark of 1,921 queries and 16,360 documents across six domains (retail, video games, books, web QA, news, debate) and four LLM engines (GPT-4o-mini, Claude 3.5 Haiku, o3, o4-mini). The outcome measured is **citation rank improvement**: after modifying one document among the ~10 given to the LLM, does the LLM cite it _earlier_ in its answer? Significance is tested with right-tailed Wilcoxon signed-rank tests under Holm-Bonferroni correction.

A note on the word "deterministic": nothing in generative engines is deterministic in the strict sense (the paper uses the providers' default sampling settings). What this paper offers is the next best thing: effects that are **reproducible and statistically significant under a fixed, published protocol**, averaged over hundreds of queries and repeated across engines. That is the standard used throughout this review.

---

## 1. Evidence that contradicts research our framework cites

Our framework's stated foundation is the KDD 2024 GEO paper. `docs/RESEARCH.md` presents its methods as "Tier 2: High Impact" and our scoring implements them as always-positive factors. C-SEO Bench re-tested those exact methods with a preference-based outcome metric and found the opposite.

| What we cite / claim                                                                                                                        | Where in our repo                                                                                                                                                                        | What C-SEO Bench found                                                                                                                                                                                                                                                                                                                                                                                    | Paper evidence                  |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| "Statistics Addition: 30-40% visibility boost"; Tier 2 "Include Statistics"                                                                 | `docs/RESEARCH.md` (Key findings table, Tier 2 item 5); `Numeric Claims` factor scores raw statistic counts as monotonically positive, 13 pts (`src/modules/grounding-signals/index.ts`) | **Statistics Addition significantly _decreased_ citation rank in 19 of 24 settings** (6 domains x 4 engines). Worst single results: -0.80 avg rank on debate and -0.53 on web QA (GPT-4o-mini); -0.82 on retail (Haiku 3.5). Never significantly positive anywhere.                                                                                                                                       | Tables 3, 4, 9, 11; Section 6.2 |
| "Cite Sources: 30-40% boost, +115% for rank-5 sites"; Tier 2 "Cite Sources"                                                                 | `docs/RESEARCH.md`; `Citation Patterns` factor, 13 pts; recommendation text at `src/modules/recommendations/constants.ts:486`                                                            | **Citations Addition was not significantly positive in any of the 24 settings.** Significantly negative on Haiku 3.5 in 4 of 6 domains (e.g. -0.49 retail, -0.31 books).                                                                                                                                                                                                                                  | Tables 3, 4, 7, 8               |
| "Quotation Addition: 30-40% boost"; our recommendation literally says "Research shows quotation addition increased AI visibility by 30-40%" | `src/modules/recommendations/constants.ts:513`; `Quoted Attribution` factor, 10 pts                                                                                                      | **Quotes Addition was not significantly positive in any setting** and significantly negative on Haiku 3.5 product domains (-0.50 retail, -0.33 books). The 30-40% figure our code cites is the word-count metric this paper shows does not measure LLM citation preference (see the metric reconciliation below).                                                                                         | Tables 3, 4, 7, 8; Section 6.2  |
| "Fluency Optimization and Easy-to-Understand: 15-30% impression boost"; readability as a scored category                                    | `docs/RESEARCH.md`; `readabilityForCompression` category, equal weight among 7 categories (`src/modules/config/schema.ts`)                                                               | **Fluency and Simple Language: zero significant positives in 24 settings each.** Fluency significantly negative on Haiku retail (-0.48) and books (-0.37).                                                                                                                                                                                                                                                | Tables 3, 4, 7, 8               |
| "Authoritative tone" as a positive method                                                                                                   | `Attribution Indicators` factor partially encodes this                                                                                                                                   | **Authoritative: zero significant positives; significantly negative on all three Haiku product domains** (-0.53 retail, -0.20 games, -0.34 books).                                                                                                                                                                                                                                                        | Table 4                         |
| GEO paper's implication that content optimization supplants traditional SEO ("traditional SEO will be outdated")                            | Framing throughout README ("Lighthouse for AI SEO") treats page content as the lever                                                                                                     | **In-context position dominates every content method.** Placing a document first in the LLM context beats the best content transformation by an order of magnitude (+2.77 vs +0.36 best content method, retail). "Traditional SEO strategies remain critical."                                                                                                                                            | Figure 4, Table 5, Section 6.3  |
| The "up to 40%" GEO numbers ported into our docs as citation-probability claims                                                             | `docs/RESEARCH.md` key findings table                                                                                                                                                    | **The paper reconciles the two studies: GEO's headline numbers use a word-count metric** (share of response words about the source), which "does not measure the LLM preference." GEO's own position-adjusted word-count results _declined_, consistent with C-SEO Bench's negative findings. The two papers do not contradict each other on preference; our docs cite the metric that does not transfer. | Section 6.2, final paragraph    |

Two important scoping notes, so we do not over-correct:

- The paper tests **adding** these elements via LLM rewriting of an existing document. It does not test whether a document that _organically_ contains rich statistics or citations outranks one that does not. Our factors measure organic presence. The contradiction is therefore strongest against our **recommendations** ("add statistics to your page") and against treating counts as universal positives, and somewhat weaker against the descriptive measurement itself.
- The paper is entirely a **generation-stage** experiment: all documents are already in the LLM context. It says nothing about crawling, indexing, or retrieval eligibility, so it neither supports nor undermines our extractability checks (robots.txt, fetch success, boilerplate).

## 2. What reproducibly increased LLM citations, how it was tested, and the results

Three effects were statistically significant positives. One is overwhelming, two are narrow.

### 2.1 Context position (the dominant effect)

**How tested:** For each query, take the ~10 retrieved documents, move a randomly chosen target document to position _i_ in the LLM context, leave content untouched, and measure the change in the LLM's citation rank of that document versus baseline. Run across all 6 domains and all 4 engines. Wilcoxon signed-rank, Holm-Bonferroni corrected.

**Results (GPT-4o-mini, avg citation-rank improvement; Table 5, p-values Table 6):**

| Context position | Retail         | Games          | Books          | Web QA         | News           | Debate         |
| ---------------- | -------------- | -------------- | -------------- | -------------- | -------------- | -------------- |
| 1st              | **+2.77**      | **+1.89**      | **+1.60**      | **+0.87**      | **+0.70**      | **+1.54**      |
| 2nd              | **+1.78**      | **+1.28**      | **+1.28**      | **+0.19**      | **+0.45**      | +0.41 (p=0.06) |
| 3rd              | **+0.67**      | **+0.57**      | **+0.48**      | -0.22          | -0.01          | -0.37          |
| 8th-10th         | -0.76 to -0.80 | -0.58 to -0.64 | -0.59 to -1.02 | -1.74 to -1.79 | -0.70 to -1.29 | -2.08 to -2.18 |

Bold = significant at p<0.05 after correction. Position 1 is p<0.0001 in **all six domains and all four engines**, including the ones where every content method failed. This is the only effect in the paper that is significant everywhere.

**Interpretation for us:** LLMs preferentially cite what appears early in their context, and retrieval rank determines context order in real engines. Anything that improves retrieval rank is worth roughly 10x any content rewrite tested. The paper does not tell us _which page features_ improve retrieval rank (that is traditional SEO/IR territory, and the SAGEO Arena paper we review next addresses it directly); it establishes that retrieval rank is the lever that matters.

### 2.2 LLM Guidance: a structured summary block at the top of the document

**How tested:** Generate an `llms.txt`-style markdown summary of the document (template: `# Title`, `> intro paragraph`, `## Section name` with brief details) and **prepend it to the document content itself**. This was the best content-side method in the benchmark.

**Results:** Significant positive on GPT-4o-mini for retail (**+0.36**, p<0.0001) and video games (**+0.24**, p<0.0001). Not significant for books, web QA, news, or debate, and not significant on Haiku 3.5, o3, or o4-mini. Under competition it also had the best area-under-curve as adoption increases. In retail, it left 61.0% of ranks unchanged, boosted 26.2%, and hurt 12.8%.

**Critical distinction for our tool:** this is **not** the `/llms.txt` domain file our `LLMs.txt Presence` factor probes for. The paper's method puts the summary **inside the document that the engine actually reads**. A domain-root file that engines may never fetch got no validation here. This paper is evidence for an on-page lead summary, and no evidence at all for the `/llms.txt` file check.

### 2.3 Content Improvement (holistic rewrite)

**How tested:** One combined rewrite applying all eight GEO transformations at once (fluency, structure, authority, etc.).

**Results:** Significant on exactly one of 24 settings: retail on GPT-4o-mini (+0.18, p=0.0008). Not evidence for a general rule; noted for completeness.

### 2.4 The null and negative space (equally load-bearing)

- Out of 54 method x domain x engine cases examined for positive gains, **only the three above were significant**.
- **No content method was significantly positive for question answering in any domain on any engine.** Our tool is mostly used on informational pages, which map to the QA task, the setting where nothing worked.
- **No content method was significantly positive on Claude 3.5 Haiku, o3, or o4-mini.** The two reasoning models and Haiku were untouched by every rewrite. Effects that exist on one engine do not transfer.
- **C-SEO is a zero-sum, congested game:** when multiple competing documents adopt the same method, the per-adopter gain shrinks steadily toward zero at full adoption (Section 6.4, Figure 5). Any point gains our tool promises are implicitly unilateral-adoption numbers.

## 3. Proposed updates to `aiseo-audit`

Ordered by how directly the paper's evidence supports them.

### 3.1 Add a "Lead Summary" factor (new, positive evidence)

The one on-page transformation that worked is detectable statically: a structured summary at the top of the content.

- New factor in `answerability` (or `contentStructure`): detect whether the first ~150 words of extracted content contain a summary block: an intro/abstract paragraph directly under the H1, or an explicit TL;DR / Key Takeaways / Overview element, followed by sectioned content. We already extract everything needed (`page.$`, `page.cleanText`, heading data).
- Recommendation copy: "Open the page with a short structured summary of what it contains (title, one-paragraph gist, section overview). In controlled tests this moved citations earlier on product-style content (C-SEO Bench, NeurIPS 2025). Evidence is limited to product domains and one engine; it did not generalize to Q&A content."
- Evidence tier: `conditional` (significant in 2 of 24 settings, best AUC under competition, harmless elsewhere: never significantly negative on GPT-4o-mini).

### 3.2 Demote the GEO-derived count factors and fix the recommendation copy (strongest contradiction)

- `Numeric Claims`, `Citation Patterns`, `Quoted Attribution`, `Attribution Indicators` (grounding signals, 47 of the category's 60 points): stop scoring raw counts as monotonically positive. Move to unscored diagnostics, or cap their score contribution and label the evidence tier `contested`.
- Delete the "Research shows quotation addition increased AI visibility by 30-40%" sentence at `src/modules/recommendations/constants.ts:513`. That number is the word-count metric; on the preference metric the same transformation measured zero to negative.
- Rewrite the `Numeric Claims` recommendation ("Include relevant statistics...") to stop advising users to add statistics as a citation tactic. If we keep any guidance here, it should say: statistics that answer the query are fine; mechanically adding statistics measurably hurt citation rank in 19 of 24 tested settings.
- `docs/RESEARCH.md`: annotate the "Key findings" table and "Tier 2: High Impact" section with the re-test results rather than leaving the 2024 numbers standing alone.

### 3.3 Reframe the report around the position finding (dominant effect)

The tool cannot measure a page's retrieval rank without a query, but it can stop implying that content polish is the main lever.

- Report/TLDR copy: state that retrieval position dominates content optimization by roughly 10x in controlled tests, and that this audit covers the content side only.
- This is additional motivation for the planned `--query` input: query-term coverage of title, meta description, and headings is the static proxy most plausibly connected to retrieval rank. This paper motivates the priority but does not validate the proxy; SAGEO Arena (next review) is the paper that tests structural-field optimization for retrieval directly.

### 3.4 Stop presenting `expectedGain` as additive certainty (zero-sum finding)

`generateRecommendations` reports `expectedGain` in points per factor. Given the congestion result, gains from popular tactics decay as adoption spreads. Minimal change: rename or caption it in reports as "audit points", not implied citation gain, and add one line in the README noting optimization gains in this space are competitive, not absolute.

### 3.5 Correct the `llms.txt` evidence story

Our `LLMs.txt Presence` factor should not cite this paper (or be cited) as support for the domain-root file. If we keep the probe, label it `experimental/no outcome evidence`. The validated relative of this idea, the in-document summary, becomes the new factor in 3.1.

### What this paper does NOT justify changing

- Extractability, robots.txt, fetch checks: out of scope for this paper (generation-stage only). No update warranted from this evidence.
- Deleting the grounding-signal _measurements_ entirely: the paper tested LLM-rewritten additions, not organic presence. Demote and relabel, do not erase.
- Any engine-specific weighting: the paper shows effects differ by engine but was not designed to produce per-engine weights.

---

## Review template note

Future reviews in this folder should follow this structure: (1) contradictions with cited research, (2) reproducible positive evidence with protocol and numbers, (3) tool changes with file-level targets, (4) explicit out-of-scope list.
