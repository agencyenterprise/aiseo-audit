# Paper Review: From Relevance to Authority (ACL 2026 Industry Track)

**Paper:** Sunkyung Lee, Jihye Back, Donghyeon Jeon, Soonhwan Kwon, Moonkwon Kim, Inho Kang, Jongwuk Lee (Sungkyunkwan University; Naver Corporation). "From Relevance to Authority: Authority-aware Generative Retrieval in Web Search Engines." ACL 2026 Industry Track, pages 796-811, DOI 10.18653/v1/2026.acl-industry.54. [ACL Anthology](https://aclanthology.org/2026.acl-industry.54/) (read in full from the Anthology PDF, including Appendix A).

**Reviewed:** August 28, 2026, against `aiseo-audit` v1.6.2. Final review in the series; previous: [C-SEO Bench](c-seo-bench-neurips-2025.md), [AutoGEO](autogeo-iclr-2026.md), [SAGEO Arena](sageo-arena-kdd-2026.md), [What Gets Cited](what-gets-cited-sigir-2026.md), [FeatGEO](featgeo-acl-2026.md), [Mind Reader](mind-reader-acl-2026.md), [IF-GEO](if-geo-findings-acl-2026.md), [MAGEO](mageo-findings-acl-2026.md), [Characterizing Web Search](characterizing-web-search-findings-acl-2026.md).

**What the paper does:** An engine-side paper from Naver, deployed on their commercial Korean search platform. AuthGR is a generative retriever (it generates host-level URLs as document identifiers) trained to prefer _authoritative_ sources, not just relevant ones. Authority is defined operationally: a vision-language model scores each site 0 to 100 from **text (title, body, URL metadata) plus a page screenshot**, against a rubric of **Expertise, Officialness, and Public Interest, with penalties for commercial intent and harmfulness**. That score becomes the reward in a three-stage training pipeline (domain pre-training on 9.85M query-document pairs, supervised fine-tuning on 3.95M filtered click pairs from health/finance, then GRPO with authority rewards over 3.75M pre-scored hosts), and the resulting model is blended with the production ranker.

**Evidence standard:** The strongest deployment evidence in the entire series: offline evaluation on 3,000 expert-labeled queries, a 500-query blind human side-by-side, and a **large-scale online A/B test on a production search engine with millions of interactions**. The authority scorer itself is validated against human expertise labels. Scope limits: Korean-language search, one platform, retrieval/ranking only (no answer generation measured), and the lever tested belongs to the engine, not to content owners. Verification note: our `EMERGING_RESEARCH.md` claims about this paper (A/B-validated authority-aware retrieval; explicitly does _not_ validate page-level proxies like author bylines or contact links) match the primary source exactly, including its caution.

---

## 1. Evidence that contradicts research our framework cites

This paper lands on `authorityContext`, our largest scored category (8 factors, 82 points), and the news is uncomfortable in a specific way: authority is real and engines optimize for it, but they measure it nothing like we do.

| What we claim / implement                                                                                                                             | Where in our repo                                            | What this paper found                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Paper evidence            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Authority audited as page-element presence: author byline selector, `og:site_name`, an /about or /contact link, publication date, schema completeness | `src/modules/authority-context/index.ts` (8 factors, 82 pts) | **A production engine defines authority as Expertise, Officialness, and Public Interest, penalizing commercial intent and harmfulness, judged holistically from content plus rendered appearance.** None of our eight factors measure any of those five dimensions. Our factors measure _self-declared provenance markup_; the engine measures _what kind of source this is_.                                                                                               | Section 3.1, Appendix A.1 |
| Text-based signals as sufficient for authority assessment (our tool is HTML-text-only)                                                                | whole-tool architecture                                      | **Text alone is the weak modality for authority.** Against human expertise labels, the scorer hit 81% accuracy text-only, 92% image-only (screenshots), 97% multimodal. The paper's stated reason: "promotional content often mimics authoritative language, making text alone deceptive." The signals our tool can see are precisely the mimicable ones; the signals that separated genuine from fake authority (ad intrusiveness, layout quality) are ones we cannot see. | Appendix A.3, Section 3.1 |
| Authority as a page-level property (each audited page gets its own authorityContext score)                                                            | per-page audit model                                         | **Authority is scored at the host level.** AuthGR uses host-level URLs as document identifiers specifically because "host-level granularity minimizes noise and exposes source identity." A page-level byline cannot move a host-level judgment; conversely, a strong host lifts pages our audit would score poorly.                                                                                                                                                        | Section 3.2               |
| No concept of commercial intent as a negative                                                                                                         | no factor exists                                             | Commercial intent is an explicit _penalty_ dimension in a deployed engine's authority rubric. Third convergent data point with AutoGEO's neutral-tone rule and What Gets Cited's (weak) promotional-tone result, and this one is from a production system.                                                                                                                                                                                                                  | Section 3.1               |

Important framing our `EMERGING_RESEARCH.md` already got right and this reading confirms: the paper **validates authority as an engine objective**, and it **does not validate any of our page-level proxies**. Both halves matter. The category should not be deleted, and it should not keep pretending its point values are measurements of what engines reward.

## 2. What the paper established, how tested, and the results

No content-side intervention is tested; the lever is the engine's. What it establishes:

### 2.1 Authority-aware ranking measurably improves a production search engine

- **Online A/B test** (millions of interactions, mid-2025): pages with clicks +21.36%, total document clicks +22.07%, top-1 CTR +22.83% relative to the production control.
- **Blind human evaluation** (500 queries, relevance + authority rated): 3.41 vs 3.06 for production, an 11.4% gain.
- **Offline:** the 3B authority-trained model matched a 14B relevance-only baseline (P@3 0.3856 vs 0.3854), and GRPO shifted generated results toward high-authority hosts (mean authority 87.2 → 90.4, low-authority generations down 10.2%).

The takeaway for content owners is directional but solid: at least one major commercial engine is _actively training retrieval to prefer_ expert, official, public-interest sources and to demote commercially aggressive ones, and that change survived a production A/B test. Optimizing to look authoritative in text while being a thin commercial page is optimizing into a headwind that engines are explicitly building against.

### 2.2 The authority rubric itself (the transferable artifact)

The scoring dimensions a deployed engine chose: **Expertise** (does the source demonstrate domain knowledge), **Officialness** (is it what it claims to be, e.g. learned associations like ".gov correlates with official institutions"), **Public Interest**, plus **commercial intent** and **harmfulness** as penalties, judged from text _and_ rendered layout (ad intrusiveness, design quality). Validated against human judgment at 97% accuracy multimodal.

### 2.3 Caveats

One engine, one country, one language; retrieval only (citation/generation behavior not measured); the rubric is Naver's, not an industry standard; and every gain reported is from changing the _engine_, so nothing here is a page-optimization effect size.

## 3. Proposed updates to `aiseo-audit`

### 3.1 Re-tier and re-describe `authorityContext` (the honest fix)

Keep the category, change its claims. All eight factors get evidence tier `heuristic` with the explicit label "provenance checks; not validated as ranking signals" (this is what our `EMERGING_RESEARCH.md` already recommends, now with the primary source confirming both halves). Recommendation copy must stop implying causal lift: "add an author byline" is defensible as provenance hygiene, not as a citation tactic. Weight reduction for the category in the v2 stage model follows from tier, not from a separate decision.

### 3.2 Add commercial-intent diagnostics (new, rubric-backed)

The one rubric dimension we can partially measure statically, and the third paper to support it: promotional/sales language density (review #2's proposed detector), affiliate-link density, ad-slot and interstitial markers in the DOM, thin-content-plus-heavy-CTA patterns. Unscored diagnostic block with a clear explanation: a production engine's authority scoring explicitly penalizes commercial aggressiveness. This is likely the highest-value _new_ check this paper enables.

### 3.3 Report the host-level reality

Two changes: (a) a report note that authority signals operate largely at the host level, so page-level provenance fixes cannot substitute for site-level identity (and a strong host partially compensates for a weak page); (b) the `--sitemap` mode is the natural home for host-level authority diagnostics: consistent organization identity across pages, uniform `og:site_name`, site-wide about/contact presence, official-domain indicators (.gov/.edu and country equivalents) as descriptive facts. This upgrades sitemap mode from "many page audits" toward "host profile plus page audits."

### 3.4 Document the visual-modality blind spot

Text-only assessment reached 81% vs 97% multimodal in the paper's own validation. Our tool parses HTML and never renders. Add this to the README limitations honestly: the audit cannot see the layout/ad-intrusiveness signals that a deployed engine found decisive for authority. A future optional check (headless render + simple layout heuristics) can be noted as probe-layer territory.

### 3.5 Close the series' traceability loop

With this review, all ten papers in `EMERGING_RESEARCH.md` have been verified against primary sources. The remaining documentation task is mechanical: the per-factor evidence table (v2 change #1) can now cite reviews 1 through 10 with regime, pipeline-stage, and metric columns filled in. Every number in our summary doc that we checked matched its primary source; the one systematic gap we found across the series was in _our tool's claims_ (README "research-backed" framing, the 30-40% quotation recommendation string, the freshness inversion), not in the summary doc.

### What this paper does NOT justify changing

- Deleting `authorityContext`: authority is a validated engine objective; our proxies are merely unvalidated. Keep, demote, relabel.
- Adding "authority points" for .gov-style domains: the engine _learned_ such correlations from data; hard-coding TLD bonuses in a static tool would be cargo-culting. Descriptive diagnostic only.
- Any effect-size claims for provenance markup: the paper contains zero page-level intervention evidence.
- Generalizing the rubric beyond Naver: one engine's operationalization, in one market. Use it as the best available reference point, labeled as such.
