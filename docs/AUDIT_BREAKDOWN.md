[< Back to README](../README.md)

# Audit Breakdown

How every audit category works in aiseo-audit 2.0: what it measures, how it scores, and how the code is structured behind it.

2.0 is a research-informed heuristic audit. Every factor carries an evidence tier and citations into the peer-reviewed GEO literature, and every numeric weight and threshold is an expert-set heuristic, not a research-derived probability. The evidence trail for each factor lives in [EVIDENCE.md](EVIDENCE.md); the underlying paper-by-paper reviews live in [paper-reviews/](paper-reviews/README.md); the cross-paper synthesis lives in [EMERGING_RESEARCH.md](EMERGING_RESEARCH.md). The 1.x version of this document is archived verbatim at [archive/v1/AUDIT_BREAKDOWN.md](archive/v1/AUDIT_BREAKDOWN.md).

---

## Table of Contents

- [How Scoring Works](#how-scoring-works)
- [Pipeline Stages](#pipeline-stages)
- [Domain Profiles](#domain-profiles)
- [Query Alignment](#query-alignment)
- [1. Content Extractability](#1-content-extractability)
- [2. Structural Alignment](#2-structural-alignment)
- [3. Content Structure for Reuse](#3-content-structure-for-reuse)
- [4. Answerability](#4-answerability)
- [5. Query Alignment (Factors)](#5-query-alignment-factors)
- [6. Entity Clarity](#6-entity-clarity)
- [7. Grounding Signals](#7-grounding-signals)
- [8. Authority Context](#8-authority-context)
- [9. Product Fit](#9-product-fit)
- [10. Readability for Compression](#10-readability-for-compression)
- [Recommendations Engine](#recommendations-engine)
- [Code Architecture](#code-architecture)
- [Sources](#sources)

---

## How Scoring Works

2.0 scores on two axes at once:

1. **10 categories** group factors by what they measure (extractability, answerability, grounding, ...). Categories are the display grouping and the weighting unit.
2. **4 pipeline stages** group the same factors by where in the generative pipeline they act (technical eligibility, retrieval alignment, citation fitness, provenance). Stages are the diagnostic rollup: they tell you _where_ a page loses, not just _that_ it loses.

Every factor lives in exactly one category (`audits/factor-names.ts`) and one stage (`FACTOR_REGISTRY` in `audits/stage.ts`), and carries an evidence tier and citations from the same registry.

### The denominator rule

Not every factor is scored. A factor is **scorable** only when both hold:

- Its status is not `neutral` (not applicable to this page) and not `info` (diagnostic output).
- Its evidence tier is not `diagnostic` (factors where the isolated causal test came back null, or the evidence is purely observational, are reported but never scored).

Non-scorable factors are excluded from the category `score` **and** from the category `maxScore`. A page is never penalized for a factor that does not apply to it, and never rewarded through a factor the research does not support scoring.

```
Category Score = sum of scorable factor scores
Category Max   = sum of scorable factor maxScores
Category %     = (Category Score / Category Max) * 100
```

### Overall score

The overall score (0-100) is a weighted average of category percentages, taken **only over categories with `maxScore > 0`**. Weights are renormalized over those categories, so a category that does not apply (for example Query Alignment when no queries are supplied, or Product Fit on an informational page) neither helps nor hurts. Configure weights in `aiseo.config.json`:

```json
{
  "weights": {
    "contentExtractability": 2,
    "answerability": 1.5,
    "entityClarity": 0.5
  }
}
```

Weights are relative; `0` excludes a category. The `engine` config option (`generic`, `gemini`, `gpt`, `perplexity`) applies experimental weight multipliers before scoring (gemini: contentStructure x1.3, groundingSignals x1.1; gpt: groundingSignals x1.3, authorityContext x1.2; perplexity: structuralAlignment x1.2, authorityContext x1.2). Presets are labeled experimental in the report.

**Optional stage weighting:** if `stageWeights` is set in config, the overall score is instead a weighted average of the four stage percentages (stages without a percentage are excluded and weights renormalized). Category weights still control nothing in that mode; raw `totalPoints`/`maxPoints` are unchanged.

### Eligibility cap

Technical eligibility is pass/fail on top of its percentage. It **fails** when any blocking factor (Fetch Success, Text Extraction Quality) lands at `critical` status, or when robots.txt blocks every known AI crawler (none allowed, none unknown). On failure:

- The overall score is capped at **25** (`ELIGIBILITY_FAIL_CAP`), which is an F.
- The three downstream stage percentages are suppressed (reported as `suppressed (eligibility failed)` instead of a number), because retrieval and citation properties of a page that engines cannot ingest are noise.

### Factor status

Each scored factor gets a status from its score share: `good` at 70%+, `needs_improvement` at 30-69%, `critical` below 30%. These thresholds also drive recommendation priority.

### Grading scale

| Score  | Grade |
| ------ | ----- |
| 93-100 | A     |
| 90-92  | A-    |
| 87-89  | B+    |
| 83-86  | B     |
| 80-82  | B-    |
| 77-79  | C+    |
| 73-76  | C     |
| 70-72  | C-    |
| 67-69  | D+    |
| 63-66  | D     |
| 60-62  | D-    |
| 0-59   | F     |

---

## Pipeline Stages

Stages mirror how a generative engine actually processes a page: it must be fetchable, then retrieved, then cited, and its provenance shapes trust. Definitions match [EVIDENCE.md](EVIDENCE.md):

| Stage  | Name                           | What it covers                                                                             |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------ |
| **TE** | Technical eligibility          | Fetch, extraction, crawler access: can engines get usable text at all                      |
| **RA** | Retrieval alignment            | Structural fields, terms, and entities that get a page retrieved and reranked into context |
| **CF** | Citation and synthesis fitness | Content properties that make an in-context page get cited and used                         |
| **PR** | Provenance and fidelity        | Authorship, organizational identity, attribution hygiene                                   |

Each stage percentage is the sum of its scorable factors' scores over their maxScores. Diagnostics contribute to no stage score. The scored rollup, from `FACTOR_REGISTRY`:

| Stage                     | Scored factors                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Technical eligibility** | Fetch Success, Text Extraction Quality, Boilerplate Ratio, AI Crawler Access, Paywall Signals                                                                                                                                                                                                                                                                                                                   |
| **Retrieval alignment**   | Title Entity Alignment, Meta Description Alignment, Heading Entity Alignment, Structured Data Alignment, Heading Hierarchy, Entity Richness, Topic Consistency, Term Repetition Balance, Structured Data, Schema Completeness, Entity Consistency, Jargon Density, Query Term Coverage (Structural)                                                                                                             |
| **Citation fitness**      | Lead Summary, Definition Patterns, Direct Answer Statements, Step-by-Step Content, Summary/Conclusion, Explanatory Depth, Query Term Coverage (Body), Query Aspect Coverage, External References, Citation Patterns, Numeric Claims, Attribution Indicators, Quoted Attribution, Hedged Language, Content Freshness, Sentence Length, Readability, Price Presence, Technical Specifications, Comparison Content |
| **Provenance**            | Author Attribution, Organization Identity, Contact/About Links                                                                                                                                                                                                                                                                                                                                                  |

Technical eligibility additionally carries a pass/fail **status** with named **blockers**: any blocking factor at `critical` (Fetch Success, Text Extraction Quality), or `AI Crawler Access` when robots.txt blocks every known AI crawler (none resolves as allowed or unknown, so a single blocked crawler alone never fails eligibility). A failed status suppresses the three downstream stage percentages and caps the overall score at 25 (see [How Scoring Works](#how-scoring-works)).

### Evidence Gates

Gates encode near-deterministic negative findings from [What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md) as **caps on the citation-fitness stage percentage**. Gates never add points; a tripped gate caps `citationFitness.pct` at its cap value (the lowest tripped cap wins, and the uncapped value is preserved as `uncappedPct` for transparency). Cap values are expert-set heuristics.

| Gate                  | Cap | Applies when                                                   | Trips when                                                               |
| --------------------- | --- | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `staleVisibleDate`    | 50  | Product (non-informational) page with a parseable visible date | The date is older than 24 months                                         |
| `offTopicForQueries`  | 50  | Target queries supplied and query alignment measured           | Every query's best coverage (structural or body) is below 0.2            |
| `missingPriceProduct` | 60  | Product page with price detection performed                    | No price signal found (neither JSON-LD offers nor visible currency text) |

---

## Domain Profiles

Pages are audited under one of two domain profiles: **product** or **informational**. Set it with `--domain` (or `domain` in config); the default is `auto`, which detects product pages by, in order:

1. JSON-LD declaring a `Product`, `Offer`, or `AggregateOffer` type
2. `og:type` containing `product`
3. Three or more visible prices (currency symbol or ISO code patterns) combined with cart vocabulary ("add to cart", "buy now", "in stock")

Anything else is informational.

**Product pages** get the [Product Fit](#9-product-fit) category (price, specifications, comparisons), are subject to the `missingPriceProduct` and `staleVisibleDate` gates, and have Explanatory Depth marked neutral (excluded from denominators). Product-page reports carry a standing warning grounded in end-to-end shopping-domain results ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)): generic content optimization measurably hurt product pages; prioritize price, specs, and comparisons over rewriting.

**Informational pages** score Explanatory Depth and omit the Product Fit category entirely; product factors are absent, not zeroed.

---

## Query Alignment

Query Alignment is a **conditional category**: it exists only when you supply target queries via `--query` (repeatable) or the `queries` config array. Maximum 10 queries; supply about 5 for stable coverage measurement.

Its factors use **worst-case-query scoring**: each factor scores the weakest of your queries, not the average. A page that fully serves four queries and ignores a fifth scores as a page that ignores a query, because per-query citation is what the evidence measures. The report names the weakest query and how many queries are adequately served.

Two coverage surfaces are measured for each query's content terms (lowercased, stopwords and words under 3 characters removed):

- **Structural coverage**: share of query terms appearing in the title, meta description, H1-H3 headings, and JSON-LD text fields. Validated retrieval lever ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md): structural-field optimization +22% retrieval hit rate).
- **Body coverage**: share of query terms appearing in the body text. Causally validated citation lever ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md): query terms present vs missing, odds ratios 5.99 to 40.0).

Both use the same bands on the worst query: 60%+ coverage = full points, 35% to <60% = 60% of max, 15% to <35% = 30% of max, below 15% = 0.

**Aspect coverage** approximates demand decomposition ([Mind Reader](paper-reviews/mind-reader-acl-2026.md)): each query is split into aspects (its named entities, falling back to its content terms), the page is split into headed sections, and an aspect counts as covered when some section's BM25 score for it reaches 0.5. This is a deliberately weaker static approximation of the paper's LLM-based method.

If every supplied query's best coverage stays below 0.2, the `offTopicForQueries` gate caps citation fitness at 50 (see [Evidence Gates](#evidence-gates)).

Factor table and exact bands: [5. Query Alignment (Factors)](#5-query-alignment-factors).

---

## 1. Content Extractability

**Question:** Can a generative engine fetch this page and pull out meaningful text at all?

### Factors

| Factor                  | Max | Stage | Evidence                                                                                              | What It Measures                                               |
| ----------------------- | --- | ----- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Fetch Success           | 12  | TE    | supported ([EVIDENCE.md](EVIDENCE.md)); blocking                                                      | HTTP status of the page fetch                                  |
| Text Extraction Quality | 12  | TE    | supported ([EVIDENCE.md](EVIDENCE.md)); blocking                                                      | Ratio of clean text bytes to raw HTML bytes                    |
| Boilerplate Ratio       | 12  | TE    | conditional ([AutoGEO](paper-reviews/autogeo-iclr-2026.md))                                           | Share of the page that is nav/footer/scripts vs actual content |
| AI Crawler Access       | 10  | TE    | supported ([Characterizing Web Search](paper-reviews/characterizing-web-search-findings-acl-2026.md)) | Are the 13 documented AI crawler tokens allowed in robots.txt? |
| Paywall Signals         | 8   | TE    | heuristic ([AutoGEO](paper-reviews/autogeo-iclr-2026.md))                                             | Paywall/login barriers in JSON-LD, DOM markers, or text        |
| Word Count Adequacy     | 0   | none  | diagnostic ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md))                                     | Word count, reported without a scored optimum                  |
| LLMs.txt Presence       | 0   | none  | experimental ([C-SEO Bench](paper-reviews/c-seo-bench-neurips-2025.md))                               | llms.txt / llms-full.txt at the signals base                   |
| Image Accessibility     | 0   | none  | diagnostic ([EVIDENCE.md](EVIDENCE.md))                                                               | Alt-text coverage and figcaption count                         |

Factors with Max 0 are unscored diagnostics (excluded from denominators): they appear in reports but contribute nothing to category or stage scores.

### Scoring Details

**Fetch Success** (blocking):

- HTTP 200 = 12
- Any status below 400 = 8
- 400+ = 0 (critical, fails technical eligibility)

**Text Extraction Quality** (blocking) measures `cleanTextLength / rawByteLength` in contiguous bands (upper bounds exclusive):

- 5% to <16% = 12 (ideal for a normal web page)
- 16% and above = 10 (text-heavy, fine but less structured)
- 1% to <5% = 8
- 0.01% to <1% = 2 (critical, fails technical eligibility)
- Below that = 0 (critical, fails technical eligibility)

**Boilerplate Ratio** scores the content share (1 minus boilerplate ratio):

- 70%+ content (under 30% boilerplate) = 12
- 50-69% content = 9
- 30-49% content = 6
- 1-29% content = 2
- Under 1% content = 0

**AI Crawler Access** parses robots.txt (wildcards, `$` anchors, longest-path-wins, `Allow` overrides at equal length) for 13 documented crawler tokens: GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, Bytespider, meta-externalagent. Path-level partial blocks are surfaced separately as `partiallyBlocked` without counting as site blocks. Scoring by fully blocked crawlers:

- 0 blocked = 10
- 1-2 blocked = 6
- 3-4 blocked = 3
- 5+ blocked = 0

When every known crawler is blocked, `AI Crawler Access` becomes an eligibility blocker (see [Pipeline Stages](#pipeline-stages)). The factor only appears when domain signals were fetched.

**Paywall Signals**:

- JSON-LD `isAccessibleForFree: false` (top level or in `hasPart`), or 2+ paywall markers = 0/8
- Exactly 1 marker = 4/8
- No markers = 8/8

Markers are paywall DOM selectors (`#paywall`, `.paywall`, Piano/metered/regwall class patterns) plus one marker if body text matches phrases like "subscribe to continue" or "sign in to read".

**Diagnostics.** Word Count Adequacy reports the raw count; no band is scored because short keyword-dense pages win retrieval while substantive pages win reranking, so no word-count optimum is validated ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)). LLMs.txt Presence reports found/not found with an explicit "no outcome evidence" label. Image Accessibility reports alt-text coverage and figcaption counts as accessibility information.

### Why This Matters

Technical eligibility is a prerequisite by construction: a page that cannot be fetched, or that yields no usable text, enters no retrieval pipeline and can never be cited, which is why its two core factors are the audit's only blocking factors. Crawler blocks are exclusion, not degradation ([Characterizing Web Search](paper-reviews/characterizing-web-search-findings-acl-2026.md) documents how AI engines source pages; [SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md) shows pages outside the retrieved context receive zero citations). Full-text accessibility without logins or paywalls appears as a learned engine preference in [AutoGEO](paper-reviews/autogeo-iclr-2026.md). The v1 word-count band was demoted to a diagnostic because the evidence pulls in both directions, and llms.txt remains experimental with no outcome evidence in any reviewed paper.

---

## 2. Structural Alignment

**Question:** Do the page's structural fields (title, meta description, headings, JSON-LD) carry the same key terms as its body?

New in 2.0. Retrieval systems weight structural fields heavily; [SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md) measured +22% retrieval hit rate and +2.72 average rank positions for structural-field optimization over body-only editing.

### Factors

| Factor                     | Max | Stage | Evidence                                                           | What It Measures                                     |
| -------------------------- | --- | ----- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| Title Entity Alignment     | 12  | RA    | conditional ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)) | Salient body terms appearing in the `<title>`        |
| Meta Description Alignment | 8   | RA    | conditional ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)) | Salient body terms appearing in the meta description |
| Heading Entity Alignment   | 10  | RA    | conditional ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)) | Salient body terms appearing in H1-H3 text           |
| Structured Data Alignment  | 6   | RA    | conditional ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)) | Salient body terms in JSON-LD text fields            |

### Scoring Details

The body's salient terms (top entities plus salient terms from NLP extraction) are matched against each structural field. All four factors use the same coverage bands (upper bounds exclusive), with midpoints rounded per factor:

- 60%+ coverage = full points
- 35% to <60% = 60% of max (Title 7, Meta 5, Heading 6, Structured Data 4)
- 15% to <35% = 30% of max (Title 4, Meta 2, Heading 3, Structured Data 2)
- Below 15% = 0

An empty field (no title, no meta description, no headings) scores 0. Neutral cases (excluded from denominators): no salient body terms to align against (all four factors), and no JSON-LD text fields present (Structured Data Alignment only). JSON-LD text fields checked: `headline`, `description`, `about`, `keywords`, `name`. The report also notes when the field carries the body's key figures.

### Why This Matters

Retrieval happens before citation, and it happens substantially on structural fields. [SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md) is the only reviewed benchmark that isolates the retrieval stage end-to-end, and its clearest result is that aligning title, headings, and metadata with the page's actual content moves retrieval more than body rewrites do. The factors are conditional rather than supported because the effect is measured on retrieval metrics in one benchmark's domains, not as a universal citation gain.

---

## 3. Content Structure for Reuse

**Question:** Is the content organized so engines can segment and chunk it?

### Factors

| Factor              | Max | Stage | Evidence                                                                    | What It Measures                               |
| ------------------- | --- | ----- | --------------------------------------------------------------------------- | ---------------------------------------------- |
| Heading Hierarchy   | 11  | RA    | heuristic ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md))            | H1/H2/H3 presence and nesting                  |
| Lists Presence      | 0   | none  | diagnostic ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md)) | List item count                                |
| Tables Presence     | 0   | none  | diagnostic ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md)) | Table count                                    |
| Paragraph Structure | 0   | none  | diagnostic ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md)) | Paragraph count and average length             |
| Scannability        | 0   | none  | diagnostic ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md)) | Bold text presence, heading-to-paragraph ratio |
| Section Length      | 0   | none  | diagnostic ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md)) | Words between consecutive headings             |

Factors with Max 0 are unscored diagnostics (excluded from denominators).

### Scoring Details

**Heading Hierarchy** awards points additively:

- Exactly 1 H1 = +4 (any other nonzero H1 count = +2)
- 2+ H2s = +4 (1 H2 = +2)
- Any H3s = +3

**Diagnostics** report list item count, table count, paragraph count with average words per paragraph, bold presence with heading-to-paragraph ratio, and headed-section count with average words per section. None are scored.

### Why This Matters

This category shrank the most from v1, on purpose. [What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md) causally isolated formatting-only manipulations (lists, tables, dense vs structured presentation) with matched page pairs and found no consistent cross-model effect on first-citation odds; the v1 claims of a 120-180 word section sweet spot and citation-boosting lists did not survive contact with that design. Heading hierarchy stays scored at low weight as a heuristic because heading _content_ is a structural retrieval field ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)); heading _counts_ are the unvalidated part. The diagnostics remain visible so structural extremes are still surfaced to a human.

---

## 4. Answerability

**Question:** Does this content state its answers directly, early, and in extractable form?

### Factors

| Factor                   | Max | Stage | Evidence                                                                                                                                                                    | What It Measures                                       |
| ------------------------ | --- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Lead Summary             | 13  | CF    | conditional ([C-SEO Bench](paper-reviews/c-seo-bench-neurips-2025.md), [AutoGEO](paper-reviews/autogeo-iclr-2026.md), [SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)) | Does the page state its conclusion first?              |
| Definition Patterns      | 10  | CF    | heuristic ([EVIDENCE.md](EVIDENCE.md))                                                                                                                                      | "is defined as", "refers to", "also known as" phrasing |
| Direct Answer Statements | 11  | CF    | conditional ([C-SEO Bench](paper-reviews/c-seo-bench-neurips-2025.md), [AutoGEO](paper-reviews/autogeo-iclr-2026.md), [SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)) | Declarative sentence openings ("The X is", "It is")    |
| Step-by-Step Content     | 10  | CF    | heuristic ([AutoGEO](paper-reviews/autogeo-iclr-2026.md))                                                                                                                   | Numbered steps, ordered lists, instruction verbs       |
| Summary/Conclusion       | 9   | CF    | heuristic ([AutoGEO](paper-reviews/autogeo-iclr-2026.md))                                                                                                                   | "in summary", "key takeaways", "TL;DR" markers         |
| Explanatory Depth        | 10  | CF    | heuristic ([AutoGEO](paper-reviews/autogeo-iclr-2026.md))                                                                                                                   | Causal/mechanism markers and how/why headings          |
| Answer Capsules          | 0   | none  | diagnostic ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md), [Mind Reader](paper-reviews/mind-reader-acl-2026.md))                                           | Concise answers after question-framed H2s              |
| Q/A Patterns             | 0   | none  | diagnostic ([Mind Reader](paper-reviews/mind-reader-acl-2026.md))                                                                                                           | Questions in content and query-shaped phrasing         |

Factors with Max 0 are unscored diagnostics (excluded from denominators).

### Scoring Details

**Lead Summary** (new in 2.0) awards points additively for conclusion-first structure:

- +5: an intro paragraph directly under the H1, 30-150 words long
- +5: an explicit summary marker (`TL;DR`, `key takeaways`, `overview`, `at a glance`, `summary`, `in brief`) within the first 150 words or in one of the first two H2/H3 headings
- +3: the first paragraph states the main claim (mentions a salient entity and uses a direct-answer pattern)

**Definition Patterns** counts matches of: `is defined as`, `refers to`, `means that`, `is a type of`, `can be described as`, `also known as`. Scoring: 6+ = 10, 3-5 = 7, 1-2 = 4, 0 = 0.

**Direct Answer Statements** counts sentence-boundary matches of `The [word] is`, `It is`, `This is`, `They are`, plus `simply put` and `in short`. Scoring: 5+ = 11, 2-4 = 8, 1 = 4, 0 = 0.

**Step-by-Step Content** sums step patterns (`step N`, numbered sequences, `firstly`/`secondly`/`finally`, `how to`), NLP-detected imperative instruction verbs, and +2 when any `<ol>` exists. Scoring: 5+ = 10, 2-4 = 7, 1 = 3, 0 = 0.

**Summary/Conclusion** counts markers (`in summary`, `in conclusion`, `to summarize`, `key takeaways`, `bottom line`, `TL;DR`). Scoring: 2+ = 9, 1 = 5, 0 = 0.

**Explanatory Depth** (new in 2.0) sums explanatory markers (`because`, `this means`, `the reason`, `which is why`, `how it works`, `works by`, `as a consequence`, `leads to`) and H2/H3 headings starting with "how" or "why". Scoring: 6+ = 10, 3-5 = 7, 1-2 = 3, 0 = 0. **Neutral on product pages** (excluded from denominators); generic depth optimization measurably hurt product content.

**Diagnostics.** Answer Capsules reports how many question-framed H2s are followed by a concise first sentence (200 characters or less); the v1 "72% of cited content" claim behind scoring it was an unverified vendor number, and formatting-only effects are causally null ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md)). Q/A Patterns reports question counts without scoring them; question framing is not a substitute for covering the query's actual demands ([Mind Reader](paper-reviews/mind-reader-acl-2026.md)).

### Why This Matters

Early, direct answers are the best-replicated content finding in the reviewed literature: [C-SEO Bench](paper-reviews/c-seo-bench-neurips-2025.md) found LLM Guidance (a lead summary block) the only content method with significant citation-rank gains, [AutoGEO](paper-reviews/autogeo-iclr-2026.md) learned "Conclusion First" as a rule on all three engines it studied, and [SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)'s reranker case study shows early answer placement improving position. That is why Lead Summary is the category's largest factor. The remaining scored factors are heuristics adjacent to that evidence (definitions, steps, summaries, explanatory depth as an AutoGEO learned rule), scored modestly and labeled as such.

---

## 5. Query Alignment (Factors)

Scored only when target queries are supplied; see [Query Alignment](#query-alignment) for semantics, guidance, and the off-topic gate.

### Factors

| Factor                           | Max | Stage | Evidence                                                                                                                         | What It Measures                                           |
| -------------------------------- | --- | ----- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Query Term Coverage (Structural) | 15  | RA    | supported ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md), [SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)) | Worst query's term coverage in title/meta/headings/JSON-LD |
| Query Term Coverage (Body)       | 15  | CF    | supported ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md))                                                       | Worst query's term coverage in body text                   |
| Query Aspect Coverage            | 10  | CF    | heuristic ([Mind Reader](paper-reviews/mind-reader-acl-2026.md))                                                                 | Worst query's aspects addressed by a dedicated section     |

### Scoring Details

**Query Term Coverage (Structural and Body)**, worst query, contiguous bands (upper bounds exclusive):

- 60%+ of the query's terms covered = 15
- 35% to <60% = 9
- 15% to <35% = 5
- Below 15% = 0

**Query Aspect Coverage**, worst query's share of aspects with a BM25-matching section (score floor 0.5):

- 70%+ of aspects covered = 10
- 40-69% = 6
- At least one aspect covered = 3
- None = 0

---

## 6. Entity Clarity

**Question:** Does this content name what it is about, consistently and without over-repeating it?

Entity extraction is hybrid NLP ([compromise](https://github.com/spencermountain/compromise) NER plus pattern-based extractors), local, with no external APIs.

### Factors

| Factor                  | Max | Stage | Evidence                                                                                                                                                                                                              | What It Measures                                      |
| ----------------------- | --- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Entity Richness         | 12  | RA    | heuristic ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md))                                                                                                                                                      | Unique named entities (people, orgs, places)          |
| Topic Consistency       | 18  | RA    | conditional ([AutoGEO](paper-reviews/autogeo-iclr-2026.md), [SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md))                                                                                                     | Title/H1 keywords aligning with body topics           |
| Term Repetition Balance | 8   | RA    | conditional ([AutoGEO](paper-reviews/autogeo-iclr-2026.md), [Mind Reader](paper-reviews/mind-reader-acl-2026.md), [FeatGEO](paper-reviews/featgeo-acl-2026.md), [SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)) | Leading term's share of the text (over-optimization)  |
| Pronoun Ambiguity       | 0   | none  | diagnostic ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md))                                                                                                                                                     | Substantial paragraphs opening with a pronoun subject |

Factors with Max 0 are unscored diagnostics (excluded from denominators).

### Scoring Details

**Entity Richness** counts unique named entities (people + organizations + places; frequency topics excluded):

- 9+ = 12
- 4-8 = 8
- 1-3 = 4
- 0 = neutral (excluded from denominators)

**Topic Consistency** takes keywords (over 3 characters) from the title and H1, then checks how many appear among extracted topics or recur 3+ times as whole words in the body:

- 50%+ aligned = 18
- Any alignment = 11
- No alignment = 0
- No title/H1 keywords at all = neutral

**Term Repetition Balance** (replaces v1's Entity Density, with the direction reversed) measures the leading salient term's share of total words (`occurrences x term word count / word count`):

- 2.5% or less = 8 (balanced)
- Over 2.5% up to 4% = 4 (approaching over-optimization)
- Over 4% = 0 (over-optimization risk)
- No salient terms = neutral

**Pronoun Ambiguity** (diagnostic) reports how many paragraphs over 25 words open with a pronoun subject (it, this, that, these, those, they, he, she).

### Why This Matters

Entities and topic terms are retrieval anchors, but the v1 assumption that more density is better was contradicted across four benchmarks: keyword stuffing was learned as a negative rule ([AutoGEO](paper-reviews/autogeo-iclr-2026.md)), keyword-focus edits underperformed ([FeatGEO](paper-reviews/featgeo-acl-2026.md)), added density caused dilution and lexical mismatch ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)), and keyword forcing drew a hallucination penalty ([MAGEO](paper-reviews/mageo-findings-acl-2026.md)). 2.0 therefore scores balance with an explicit over-repetition warning band instead of rewarding density. Topic consistency stays scored because on-topic vs off-topic is the strongest causal effect in [What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md). Pronoun-explicit openings are part of a winning bundle in SAGEO Arena but were not individually ablated, so they stay diagnostic.

---

## 7. Grounding Signals

**Question:** Does this content back its claims with evidence, attribution, and confident language?

### Factors

| Factor                 | Max | Stage | Evidence                                                                                                                               | What It Measures                               |
| ---------------------- | --- | ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| External References    | 13  | CF    | heuristic ([AutoGEO](paper-reviews/autogeo-iclr-2026.md))                                                                              | Links to other domains                         |
| Citation Patterns      | 13  | CF    | conditional ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md), [C-SEO Bench](paper-reviews/c-seo-bench-neurips-2025.md)) | Formal citation indicators plus quote elements |
| Numeric Claims         | 13  | CF    | conditional ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md), [C-SEO Bench](paper-reviews/c-seo-bench-neurips-2025.md)) | Statistics, percentages, written-out numbers   |
| Attribution Indicators | 11  | CF    | conditional ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md))                                                           | "according to", "said", "reported" phrases     |
| Quoted Attribution     | 10  | CF    | heuristic ([C-SEO Bench](paper-reviews/c-seo-bench-neurips-2025.md))                                                                   | Quotes explicitly attributed to a named source |
| Hedged Language        | 10  | CF    | conditional ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md))                                                           | Share of sentences containing hedge words      |

### Scoring Details

**External References** counts links to other domains: 6+ = 13, 3-5 = 10, 1-2 = 6, 0 = 0.

**Citation Patterns** sums citation indicators (`[1]`, author-year, `research shows`, ...) and quote elements (`<blockquote>`, `<q>`, standalone `<cite>`): 6+ = 13, 3-5 = 9, 1-2 = 5, 0 = 0.

**Numeric Claims** sums statistical pattern matches (percentages, large numbers, currency, change verbs) and NLP-detected written-out numbers: 9+ = 13, 4-8 = 9, 1-3 = 5, 0 = 0.

**Attribution Indicators** counts attribution phrases: 5+ = 11, 2-4 = 8, 1 = 4, 0 = 0.

**Quoted Attribution** sums inline attributed-quote patterns and `<blockquote>` elements containing `<cite>`/`<footer>`/`<figcaption>`: 4+ = 10, 2-3 = 7, 1 = 4, 0 = neutral (excluded from denominators).

**Hedged Language** (new in 2.0) measures the share of sentences containing a hedge from the [hedges](https://github.com/words/hedges) lexicon:

- 5% or less = 10 (confident)
- Over 5% up to 12% = 6
- Over 12% up to 20% = 3
- Over 20% = 0
- No sentences = neutral

### Why This Matters

The strongest causal result in [What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md) after topicality is language confidence: confident vs hedged framing produced first-citation odds ratios of 599 and 754 on Gemini and Claude (2.67 to 10.6 elsewhere), which is why Hedged Language is scored despite being a 2.0 newcomer. Evidence-bearing claims (statistics, attribution adjacent to claims) also differentiate causally there. The caution baked into these factors comes from [C-SEO Bench](paper-reviews/c-seo-bench-neurips-2025.md): mechanically adding statistics reduced citation rank in 19 of 24 settings, and quotation/cite-sources transformations were null-to-negative on citation rank. The recommendation texts therefore push real, verifiable evidence, not decoration. The v1 claim that quotes boost visibility 30-40% traced to word-count metrics in the foundational GEO paper, not citation odds, and was dropped.

---

## 8. Authority Context

**Question:** Does this page carry the provenance and identity signals engines use to evaluate sources?

### Factors

| Factor                 | Max | Stage | Evidence                                                                                                                                                                | What It Measures                                        |
| ---------------------- | --- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Author Attribution     | 10  | PR    | heuristic ([Authority-Aware GenIR](paper-reviews/authority-aware-genir-acl-2026.md))                                                                                    | Byline, author meta tags, schema markup                 |
| Organization Identity  | 10  | PR    | heuristic ([Authority-Aware GenIR](paper-reviews/authority-aware-genir-acl-2026.md))                                                                                    | Organization schema or og:site_name                     |
| Contact/About Links    | 10  | PR    | heuristic ([Authority-Aware GenIR](paper-reviews/authority-aware-genir-acl-2026.md))                                                                                    | Links to about/team/company and contact pages           |
| Content Freshness      | 12  | CF    | conditional ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md), [Characterizing Web Search](paper-reviews/characterizing-web-search-findings-acl-2026.md)) | Content age, scored only on time-sensitive topics       |
| Structured Data        | 12  | RA    | conditional ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md))                                                                                                      | JSON-LD, Open Graph tags, canonical URL                 |
| Schema Completeness    | 10  | RA    | heuristic ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md))                                                                                                        | Expected properties present on recognized JSON-LD types |
| Entity Consistency     | 10  | RA    | conditional ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md), [Authority-Aware GenIR](paper-reviews/authority-aware-genir-acl-2026.md))                            | Brand name consistent across page surfaces              |
| Date Markup            | 0   | none  | diagnostic ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md))                                                                                             | Machine-readable date presence                          |
| Topic Time Sensitivity | 0   | none  | diagnostic ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md), [Characterizing Web Search](paper-reviews/characterizing-web-search-findings-acl-2026.md))  | Whether the topic is time-sensitive at all              |
| Promotional Language   | 0   | none  | diagnostic ([Authority-Aware GenIR](paper-reviews/authority-aware-genir-acl-2026.md), [AutoGEO](paper-reviews/autogeo-iclr-2026.md))                                    | Promotional phrases and exclamations per 1,000 words    |
| Affiliate Link Density | 0   | none  | diagnostic ([Authority-Aware GenIR](paper-reviews/authority-aware-genir-acl-2026.md))                                                                                   | Share of external links carrying affiliate markers      |
| Ad Slot Markers        | 0   | none  | diagnostic ([Authority-Aware GenIR](paper-reviews/authority-aware-genir-acl-2026.md))                                                                                   | Ad slot elements in the DOM                             |
| Site Type              | 0   | none  | diagnostic ([Characterizing Web Search](paper-reviews/characterizing-web-search-findings-acl-2026.md))                                                                  | Forum / user-generated-content signals                  |

Factors with Max 0 are unscored diagnostics (excluded from denominators).

### Scoring Details

**Author Attribution**: any author selector match (rel=author, .byline, meta author, itemprop, ...) = 10, none = 0.

**Organization Identity**: `Organization` JSON-LD (including `@graph` envelopes) or `og:site_name` = 10, neither = 0.

**Contact/About Links**: about-type link (path segment or link text `about`/`team`/`company`) AND contact link (`contact` or `mailto:`) = 10; one of the two = 5; neither = 0.

**Content Freshness** is scored only for time-sensitive topics (see Topic Time Sensitivity below). It prefers `dateModified` over `datePublished` and computes age in calendar months:

- 24 months old or less = 12
- Older than 24 months = 0 (visibly stale)
- Time-sensitive but no parseable date = neutral (an absent date measurably outperforms a visibly stale one)
- Evergreen topic = neutral (age is not scored at all)

**Structured Data** awards points additively: any JSON-LD `@type` = +4; 3+ of the four OG tags (og:title, og:description, og:image, og:type) = +4 (1-2 tags = +2); canonical link = +4.

**Schema Completeness** checks recognized JSON-LD types for the properties engines expect (Article/NewsArticle/BlogPosting: headline, author, datePublished; FAQPage: mainEntity; HowTo: name, step; Organization: name, url; LocalBusiness: name, address; Product: name; WebPage: name), averaged across recognized schemas:

- 80%+ average completeness = 10
- 50-79% = 7
- Above 0% = 4
- Recognized types with no expected properties = 0
- No recognized types = neutral

**Entity Consistency** resolves the brand name (og:site_name, else Organization name, else publisher name) and checks 4 surfaces (title, og:title, footer, header/copyright):

- 4/4 surfaces = 10, 3 = 7, 2 = 4, 1 = 2, 0 = 0
- No identifiable entity name = neutral

**Diagnostics.** Date Markup reports machine-readable date presence without scoring it (date presence is not independently positive). Topic Time Sensitivity reports whether the topic looks time-sensitive (NewsArticle/Event/LiveBlogPosting schema, a year in the title or H1, trend vocabulary, or a /news/ or /blog/ URL path) and gates whether freshness is scored at all. Promotional Language, Affiliate Link Density, and Ad Slot Markers report commercial-intent intensity. Site Type flags forum or user-generated-content signals, with a note that GPT-family engines cite such sources measurably less than classic search surfaces them.

### Why This Matters

Authority is a validated objective for a production engine: [Authority-Aware GenIR](paper-reviews/authority-aware-genir-acl-2026.md) documents a deployed system explicitly reranking for authority, with a rubric that penalizes commercial aggressiveness. But no reviewed paper validates page-level provenance markers (bylines, about pages) as ranking signals, and authority operates largely at host level, so those factors stay heuristic at modest weight. Freshness follows the causal ordering in [What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md): recent beats none beats visibly stale, so evergreen pages and pages without dates are neutral rather than penalized, and only visible staleness costs points (and can trip a [gate](#evidence-gates) on product pages). Structured data and entity consistency are scored as retrieval-alignment mechanisms per [SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md), not as trust badges.

---

## 9. Product Fit

**Question:** Does this product page carry the content that decides product citations: price, specs, comparisons?

Scored **only on product pages** (see [Domain Profiles](#domain-profiles)). All three factors derive from [What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md), the one reviewed benchmark with causal product-domain results.

### Factors

| Factor                   | Max | Stage | Evidence                                                                                   | What It Measures                             |
| ------------------------ | --- | ----- | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Price Presence           | 15  | CF    | supported, product domain ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md)) | Price in JSON-LD offers or visible text      |
| Technical Specifications | 10  | CF    | conditional ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md))               | Spec rows, labeled attributes, model numbers |
| Comparison Content       | 8   | CF    | conditional ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md))               | "vs", "compared to", comparison tables       |

### Scoring Details

**Price Presence**: price found in JSON-LD (`price`, or `offers` carrying `price`/`lowPrice`) or as visible currency text = 15; none = 0. A missing price also trips the `missingPriceProduct` [gate](#evidence-gates) (citation fitness capped at 60).

**Technical Specifications** sums: table rows containing digits, `<dl><dt>` pairs, list items with spec labels (`weight:`, `dimensions:`, `battery:`, ...), and model-number matches (capped at 5). Scoring: 6+ = 10, 3-5 = 7, 1-2 = 3, 0 = 0.

**Comparison Content** sums comparison language hits (`vs`, `compared to/with`, `alternatives to`, `better than`, `pros and cons`) plus 2 points per comparison-flavored table. Scoring: 5+ = 8, 2-4 = 5, 1 = 2, 0 = 0.

### Why This Matters

In [What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md)'s product-domain experiments, explicit price acted as a near-deterministic citation gatekeeper, and specifications were a consistent differentiator, with comparison content a weaker one. These effects are explicitly domain-specific, which is why the category exists only under the product profile and why product reports carry the warning that generic content optimization measurably hurt product pages in end-to-end tests ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md)).

---

## 10. Readability for Compression

**Question:** Is the prose above the floor where engines stop reusing it?

### Factors

| Factor           | Max | Stage | Evidence                                                                                                              | What It Measures                     |
| ---------------- | --- | ----- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Sentence Length  | 10  | CF    | heuristic, floor ([FeatGEO](paper-reviews/featgeo-acl-2026.md))                                                       | Average words per sentence           |
| Readability      | 10  | CF    | heuristic, floor ([FeatGEO](paper-reviews/featgeo-acl-2026.md), [Mind Reader](paper-reviews/mind-reader-acl-2026.md)) | Flesch Reading Ease                  |
| Jargon Density   | 10  | RA    | conditional, floor ([SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md))                                             | Share of complex (4+ syllable) words |
| Transition Usage | 0   | none  | diagnostic ([What Gets Cited](paper-reviews/what-gets-cited-sigir-2026.md))                                           | Distinct transition words used       |

Factors with Max 0 are unscored diagnostics (excluded from denominators).

### Scoring Details

v1's graded readability bands are gone. Each factor is now a pass/fail **floor**: full points unless the page falls below a threshold no reasonable page should cross.

- **Sentence Length**: 10 unless the average exceeds 35 words per sentence, then 0.
- **Readability**: 10 unless Flesch Reading Ease is below 30, then 0.
- **Jargon Density**: 10 unless complex words (4+ syllables) exceed 10% of all words, then 0.
- **Transition Usage** (diagnostic): reports how many distinct transition words appear; no evidence in any reviewed paper.

### Why This Matters

Readability helps only below a floor, and polishing already-fluent prose backfires: [FeatGEO](paper-reviews/featgeo-acl-2026.md) found fluency edits reduced visibility on already-fluent pages, [Mind Reader](paper-reviews/mind-reader-acl-2026.md) measured its Easy-to-Understand rewrite below vanilla (16.20 vs 19.85), and [C-SEO Bench](paper-reviews/c-seo-bench-neurips-2025.md) found fluency optimization null on citation rank. Jargon is scored as a retrieval problem, not a style problem: [SAGEO Arena](paper-reviews/sageo-arena-kdd-2026.md) measured -14% retrieval hit rate from added technical terms via lexical mismatch with query vocabulary. The same research powers the recommendation engine's [polish gate](#recommendations-engine), which suppresses simplify-direction advice on pages that already read as fluent.

---

## Recommendations Engine

`recommendations/service.ts` drafts one recommendation per underperforming factor, then coordinates them.

**Selection.** Every factor with status `neutral` or `info` is skipped (not applicable or diagnostic). Every remaining factor below 70% of its max gets a recommendation. Priority follows the factor status bands:

| Factor Score | Priority |
| ------------ | -------- |
| Below 30%    | `high`   |
| 30-49%       | `medium` |
| 50-69%       | `low`    |

**Builder registry.** `RECOMMENDATION_BUILDERS` in `recommendations/constants.ts` is a `Record<FactorNameType, RecommendationBuilder>`: the compiler forces a builder for every registered factor. Builders receive the audit's `rawData` and return text plus optional `direction`, `steps`, `codeExample`, and `learnMoreUrl` (static HTML examples live in `recommendations/examples.ts`). Each recommendation also carries the factor's **evidence tier and citations** straight from the registry, so every piece of advice is traceable to the same evidence row as the factor that produced it.

**Polish gate.** When the page already reads as polished (Flesch Reading Ease 50-75, average sentence length 12-24 words, and at least one headed section), any recommendation whose builder carries the `simplify` direction is suppressed entirely, and style-rewrite factors (Readability, Sentence Length) carry an explicit suppression note. Rationale: stylistic rewriting of already-polished content measurably reduced visibility ([FeatGEO](paper-reviews/featgeo-acl-2026.md), [Mind Reader](paper-reviews/mind-reader-acl-2026.md)).

**Direction conflicts.** Builders declare an optimization direction (`simplify`/`deepen`, `shorten`/`expand`, `add`/`remove`). When both sides of an opposing pair survive drafting, the engine collapses them into a single conflict item (priority = highest among the merged recommendations) that names both pulls and tells the user to pick the audience the page serves. The merged item cites [IF-GEO](paper-reviews/if-geo-findings-acl-2026.md), which showed that optimizing for one audience commonly degrades others.

**Ordering and display.** Recommendations sort by priority, then alphabetically by factor. Human-readable reports show the **top 3** with a "N more in JSON output" note and a standing footer: apply the top items and re-measure before continuing, because gains do not stack additively and each addition competes for the same content budget.

**auditPoints.** Each recommendation reports `auditPoints = maxScore - score`: the factor's remaining internal audit weight. These are ordering weights inside this tool, not additive citation-probability gains, and the reports say so explicitly.

---

## Code Architecture

### Pipeline

When you run `aiseo-audit https://example.com`:

```
cli.ts -> cli/program.ts        parses args with commander, owns exit codes
  |
  v
config/service.ts               loads aiseo.config.json, merges defaults via Zod
  |                             (queries, domain, engine, weights, stageWeights)
  v
analyzer/service.ts             orchestrates the full pipeline:
  |
  +---> fetcher/service.ts      fetch GET -> raw HTML, status code, timing
  |
  +---> fetchDomainSignals()    parallel fetch: robots.txt, llms.txt, llms-full.txt
  |
  +---> extractor/service.ts    cheerio.load -> clean text, stats, $ instance
  |
  +---> audits/service.ts       detects the domain profile, runs the 8 core
  |                             categories + conditional queryAlignment/productFit
  |
  +---> scoring/stages.ts       computeStages(): stage rollup, eligibility
  |                             blockers, evidence gates, suppression
  |
  +---> scoring/service.ts      computeScore(): weight renormalization over
  |                             applicable categories (or stage weights),
  |                             eligibility cap, grade
  |
  +---> recommendations/        builder registry, polish gate,
  |     service.ts              direction-conflict merging
  |
  v
report/service.ts               renders output (pretty, json, md, or html)
```

Sitemap audits (`--sitemap`) fetch domain signals once from the sitemap origin (or `--signals-base`) and run the analyzer pipeline per URL with shared signals.

### Module Pattern

Every module keeps the same layout: `schema.ts` (contract types; Zod where data is parsed at a trust boundary), `service.ts` (pure logic, throws on failure), `constants.ts` (thresholds and display names), `support/` (private helpers). Error handling and exit codes live in `cli/program.ts` (0 success, 1 below `--fail-under`, 2 usage or runtime error).

### The two choke points

Everything score-related flows through two files:

**`audits/stage.ts` (FACTOR_REGISTRY + CITATION_GATES).** The registry is the single source of truth for every factor's pipeline stage, evidence tier, citations, and blocking flag. `makeFactor`/`makeDiagnostic` read tier and citations from it, `computeStages` reads stages and blocking from it, and recommendations inherit evidence from it. The same file defines the evidence gates and `resolveDomain`. A factor cannot exist without a registry entry: `FACTOR_REGISTRY` is a `Record<FactorNameType, FactorMetaType>`, so a missing entry is a compile error.

**`scoring/stages.ts` (computeStages).** The only place stage scores are computed: rolls scorable factors up by registry stage, derives eligibility status and blockers, evaluates gates against `rawData`, applies the lowest tripped cap to citation fitness, and suppresses downstream percentages on eligibility failure.

Supporting that, `scoring/service.ts` owns `isScorable` (the denominator rule), `thresholdScore` (higher / lower / contiguous-range band evaluation), `makeFactor`/`makeDiagnostic`, and `computeScore`.

### Adding a factor (compiler-enforced path)

1. Add the display name to `audits/factor-names.ts` under its category. This immediately breaks the build until steps 2 and 4 are done.
2. Add its registry entry (stage, evidence tier, citations, optional blocking) in `audits/stage.ts`.
3. Emit it from the category module via `makeFactor` (scored) or `makeDiagnostic` (unscored).
4. Add its builder to `RECOMMENDATION_BUILDERS` in `recommendations/constants.ts`.
5. Add its row to [EVIDENCE.md](EVIDENCE.md) with tier, stage, evidence links, regime, and metric. A factor without an EVIDENCE row is undocumented and blocked from release (see the maintenance rule in that file).

Steps 1-4 are enforced by the type system; step 5 is enforced by review.

### Category modules

Each category is a top-level module with an `audit<Category>()` entry point and colocated helpers:

```
content-extractability/   index.ts, robots.ts (robots parser), paywall.ts
structural-alignment/     index.ts (salience coverage of structural fields)
content-structure/        index.ts, sections.ts
answerability/            index.ts, lead-summary.ts, capsules.ts, patterns.ts, questions.ts
query-alignment/          index.ts, coverage.ts (term coverage), aspects.ts (BM25 sections)
entity-clarity/           index.ts, pronouns.ts
grounding-signals/        index.ts, hedging.ts, patterns.ts
authority-context/        index.ts, freshness.ts, time-sensitivity.ts, commercial.ts,
                          site-type.ts, entity.ts, schema-analysis.ts, selectors.ts
product-fit/              index.ts (price, specs, comparisons)
readability/              index.ts, transition-words.ts
domain-profile/           index.ts (detectDomain)
```

`audits/service.ts` (`runAudits`) extracts entities once, detects the domain profile, always runs the 8 core categories, and conditionally adds `queryAlignment` (queries supplied) and `productFit` (product domain). It is the single merge point for `rawData`, which downstream feeds gates, recommendations builders, and reports.

### Key Data Types

```typescript
FetchResult     -> fetcher (html, status, timing)
ExtractedPage   -> extractor (cleanText, $, stats)
AuditResult     -> audits (categories, rawData)
StageScores     -> scoring/stages (per-stage score/max/pct, blockers, gates)
ScoreSummary    -> scoring (overallScore, grade, totalPoints, maxPoints)
Recommendation  -> recommendations (priority, direction, evidence, citations,
                   auditPoints, optional steps/codeExample/learnMoreUrl)
AnalyzerResult  -> analyzer assembles all of the above
```

---

## Sources

All scoring rationale in this document traces to ten peer-reviewed papers, each reviewed from the primary source in [paper-reviews/](paper-reviews/README.md):

| Paper                                                 | Venue                | Review                                                                                                         |
| ----------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| C-SEO Bench: Does Conversational SEO Work?            | NeurIPS 2025 D&B     | [c-seo-bench-neurips-2025.md](paper-reviews/c-seo-bench-neurips-2025.md)                                       |
| What Generative Search Engines Like (AutoGEO)         | ICLR 2026            | [autogeo-iclr-2026.md](paper-reviews/autogeo-iclr-2026.md)                                                     |
| SAGEO Arena                                           | KDD 2026             | [sageo-arena-kdd-2026.md](paper-reviews/sageo-arena-kdd-2026.md)                                               |
| What Gets Cited: Competitive GEO in AI Answer Engines | SIGIR 2026           | [what-gets-cited-sigir-2026.md](paper-reviews/what-gets-cited-sigir-2026.md)                                   |
| Think Before Writing (FeatGEO)                        | ACL 2026             | [featgeo-acl-2026.md](paper-reviews/featgeo-acl-2026.md)                                                       |
| Mind Reader                                           | ACL 2026             | [mind-reader-acl-2026.md](paper-reviews/mind-reader-acl-2026.md)                                               |
| IF-GEO                                                | Findings of ACL 2026 | [if-geo-findings-acl-2026.md](paper-reviews/if-geo-findings-acl-2026.md)                                       |
| From Experience to Skill (MAGEO)                      | Findings of ACL 2026 | [mageo-findings-acl-2026.md](paper-reviews/mageo-findings-acl-2026.md)                                         |
| Characterizing Web Search in the Age of Generative AI | Findings of ACL 2026 | [characterizing-web-search-findings-acl-2026.md](paper-reviews/characterizing-web-search-findings-acl-2026.md) |
| From Relevance to Authority                           | ACL 2026 Industry    | [authority-aware-genir-acl-2026.md](paper-reviews/authority-aware-genir-acl-2026.md)                           |

Per-factor evidence trails, tiers, regimes, and metrics: [EVIDENCE.md](EVIDENCE.md). Cross-paper synthesis: [EMERGING_RESEARCH.md](EMERGING_RESEARCH.md).

The v1 document cited several vendor and industry sources (Search Engine Land, Semrush, WebFX, Seer Interactive, KnewSearch, AIVO); those claims did not survive the peer-review pass and are intentionally not carried forward. The original list is preserved in [archive/v1/AUDIT_BREAKDOWN.md](archive/v1/AUDIT_BREAKDOWN.md).
