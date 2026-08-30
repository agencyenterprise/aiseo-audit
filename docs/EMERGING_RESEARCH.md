[< Back to docs index](README.md)

# Emerging Scientific Research on Generative Engine Optimization

Last reviewed: August 28, 2026

## Purpose and Scope

This document reviews scientific research published or formally accepted between approximately August 28, 2025 and August 28, 2026 that is directly relevant to Generative Engine Optimization (GEO), conversational search optimization, generative retrieval, and citation visibility.

It is intended to answer four questions:

1. Which conclusions from the foundational GEO paper have been reproduced or qualified?
2. Which webpage characteristics have controlled experimental support?
3. Which claims remain hypotheses rather than established findings?
4. How should this evidence affect the design and interpretation of `aiseo-audit`?

## Evidence Standard

The primary evidence base in this document consists of:

- Peer-reviewed conference papers and formally accepted papers from KDD, NeurIPS, ICLR, SIGIR, and ACL.
- Controlled experiments, reproducible benchmarks, statistical evaluations, and systematic measurements of deployed generative search systems.
- Primary papers and official proceedings rather than articles summarizing those papers.

The following are not treated as scientific evidence here:

- Marketing articles, SEO publications, and vendor blog posts.
- Vendor benchmark reports without peer-reviewed methods and results.
- Proposed specifications such as `llms.txt`.
- Standards proposals that have not been experimentally validated.
- Preprints that have not been accepted at a peer-reviewed venue, unless explicitly identified as preliminary evidence.

These materials may provide operational guidance or generate useful hypotheses, but they cannot establish causal effects or justify quantitative scoring weights by themselves.

## Executive Conclusion

The newer literature does not invalidate the foundational GEO paper. It narrows its interpretation.

The foundational work shows that, **after a source has entered a generative model's context**, changes to that source can affect how prominently the model uses it. Newer work shows that:

- Retrieval and context position often matter more than fixed content-rewriting heuristics.
- Formatting-only rules do not transfer reliably across engines, domains, queries, or content quality levels.
- Content optimization can improve generation-stage visibility while simultaneously harming retrieval or reranking.
- The most reproducible content characteristics are query relevance, information completeness, concrete evidence, factual consistency, and prominence of directly relevant claims.
- Engine-specific, query-aware, and pipeline-stage-aware methods outperform universal checklists.
- Real generative search systems are sufficiently unstable that visibility should be measured repeatedly and reported with uncertainty.

Accordingly, `aiseo-audit` is best described today as a **research-informed heuristic audit**, not a scientifically validated predictor of citation probability or AI-search traffic.

## Foundation: What the KDD 2024 GEO Paper Established

**Citation:** Pranjal Aggarwal, Vishvak Murahari, Tanmay Rajpurohit, Ashwin Kalyan, Karthik Narasimhan, and Ameet Deshpande. 2024. “GEO: Generative Engine Optimization.” _Proceedings of the 30th ACM SIGKDD Conference on Knowledge Discovery and Data Mining_, pages 5–16. [DOI: 10.1145/3637528.3671900](https://doi.org/10.1145/3637528.3671900). [Open-access version](https://arxiv.org/abs/2311.09735).

### Experimental design

- Introduced GEO-Bench with approximately 10,000 queries from multiple datasets and domains.
- Supplied a predetermined set of source documents to a generative engine.
- Applied one of nine content transformations to a selected source.
- Measured source visibility using cited word count, position-adjusted word count, and a subjective impression metric.
- Performed an additional, smaller evaluation using Perplexity as a black-box system.

### Supported conclusion

When a document is already present in the generator's source context, adding relevant citations, quotations, or statistics can increase how much of that source is reflected in the answer in some settings. The strongest methods produced roughly 30–40% relative improvement on particular visibility metrics, with substantial variation by domain and the source's starting position.

### What the experiment does not establish

The study does not establish that those transformations cause a document to be:

- Crawled or indexed from the open web.
- Retrieved for a query.
- Ranked into the generator's context.
- Preferred over a directly competing source.
- Cited consistently across time or commercial engines.
- Clicked by a user or converted into downstream traffic.

The frequently repeated “up to 40%” result is a conditional maximum within the paper's experimental visibility metrics. It is not a universal 40% increase in real-world citation probability.

## New Peer-Reviewed and Accepted Research

### 1. C-SEO Bench: Does Conversational SEO Work?

**Status:** Peer-reviewed, NeurIPS 2025 Datasets and Benchmarks Track.

**Citation:** Haritz Puerto, Martin Gubri, Tommaso Green, Seong Joon Oh, and Sangdoo Yun. 2025. “C-SEO Bench: Does Conversational SEO Work?” _Advances in Neural Information Processing Systems 38_. [DOI: 10.52202/085713-0923](https://doi.org/10.52202/085713-0923). [Official proceedings](https://proceedings.neurips.cc/paper_files/paper/2025/hash/27aa3aeff0f8460a7b43d30fa6c5c032-Abstract-Datasets_and_Benchmarks_Track.html). [Paper](https://papers.neurips.cc/paper_files/paper/2025/file/27aa3aeff0f8460a7b43d30fa6c5c032-Paper-Datasets_and_Benchmarks_Track.pdf).

#### Experimental design

- More than 1,900 queries and 16,000 documents.
- Two tasks: question answering and product recommendation.
- Six domains: general web, news, debate, retail, video games, and books.
- Ten content-optimization methods, including the methods introduced by Aggarwal et al.
- Multiple adoption rates to simulate competition between content owners.
- Citation-rank improvement as the primary outcome.
- Wilcoxon signed-rank tests with Holm–Bonferroni correction for multiple comparisons.

#### Results

- Most fixed content-rewriting methods were ineffective outside narrow task and domain combinations.
- Several methods significantly reduced citation ranking.
- Statistics Addition decreased ranking in 19 of 24 evaluated settings.
- No tested method was consistently effective for question answering.
- Moving a document earlier in the retrieved context produced substantially larger citation-rank gains than any content-rewriting method.
- Marginal gains decreased as more competing content owners adopted the same optimization.

#### Interpretation

This study uses a different outcome from the foundational GEO paper. It measures which source is cited earlier, whereas the original work emphasized how much source-associated text appeared in the response. Its results therefore qualify rather than simply contradict the original study.

The paper provides strong evidence against treating statistics, quotations, citations, fluency, or similar transformations as universal positive scoring factors.

### 2. What Generative Search Engines Like and How to Optimize Web Content Cooperatively (AutoGEO)

**Status:** Peer-reviewed, ICLR 2026.

**Citation:** Yujiang Wu, Shanshan Zhong, Yubin Kim, and Chenyan Xiong. 2026. “What Generative Search Engines Like and How to Optimize Web Content Cooperatively.” _International Conference on Learning Representations_. [OpenReview paper](https://openreview.net/forum?id=K8EinVWtUB). [Open-access version](https://arxiv.org/abs/2510.11438).

#### Experimental design

- Evaluated GEO-Bench and two additional datasets: Researchy-GEO and E-commerce.
- Used generative engines constructed with Gemini, GPT, and Claude models.
- Automatically extracted preference rules from high- and low-visibility document pairs.
- Used the learned rules for prompt-based rewriting and reinforcement-learning-based rewriting.
- Evaluated visibility, semantic consistency, faithfulness, clarity, and answer quality.

#### Results

- AutoGEO reported an average 35.99% improvement across the paper's GEO visibility metrics while maintaining its measured generative-engine utility.
- Preference rules differed substantially between engines and domains.
- Engine-specific rules consistently outperformed a single global rule set.
- A compact reinforcement-learning model reproduced much of the performance at lower inference cost.

#### Interpretation

The study provides evidence that adaptive content optimization can work in controlled RAG environments. However, the candidate documents are already retrieved. It therefore supports generation-stage optimization rather than open-web discoverability.

Its strongest implication for `aiseo-audit` is that an engine-agnostic universal weighting scheme is unlikely to remain valid across engines and domains.

### 3. SAGEO Arena: A Realistic Environment for Evaluating Search-Augmented GEO

**Status:** Formally accepted at KDD 2026.

**Citation:** Sunghwan Kim, Wooseok Jeong, Serin Kim, Sangam Lee, and Dongha Lee. 2026. “SAGEO Arena: A Realistic Environment for Evaluating Search-Augmented Generative Engine Optimization.” _ACM SIGKDD Conference on Knowledge Discovery and Data Mining_. [Paper](https://arxiv.org/abs/2602.12187). [Code and artifacts](https://github.com/happysnail06/SAGEO_Arena).

#### Experimental design

- 2,700 queries across nine domains.
- 171,003 web documents retaining titles, meta descriptions, headings, JSON-LD text, and body content.
- End-to-end pipeline using BM25 retrieval, Qwen3-Reranker-4B, and GPT-5-mini generation.
- Top 100 passages retrieved, top 10 retained after reranking, followed by answer generation.
- Evaluated body-only, structural-only, and combined optimization across retrieval, reranking, and generation.

#### Results

- Body-only GEO transformations frequently reduced retrieval performance and provided only marginal generation-stage gains.
- Optimizing structural fields increased retrieval hit rate by 22% and improved average retrieval rank by 2.72 positions compared with body-only optimization.
- Structural fields helped surface a document, while the body supplied most of the evidence ultimately cited.
- All evaluated optimization methods decreased citation likelihood in the shopping domain.
- Approximately 5.8% of target documents fell from reranking position 10 to 11 after optimization, excluding them from the generator's context.
- The proposed stage-aware method improved top-20 retrieval hit rate by 28% and increased citation rate from 0.50 to 0.58.

#### Interpretation

This is the strongest recent evidence that a useful audit must distinguish at least three stages:

1. Retrieval eligibility and query matching.
2. Reranking into the limited generator context.
3. Citation and factual use during answer generation.

The paper supports meaningful titles, headings, metadata, entity terms, and concise structural summaries for retrieval. It does not demonstrate that a particular schema type or schema-completeness checklist directly increases citations.

Its environment is reproducible but does not reproduce all proprietary commercial ranking or user-behavior signals.

### 4. What Gets Cited: Competitive GEO in AI Answer Engines

**Status:** Peer-reviewed, SIGIR 2026.

**Citation:** Rahul Vishwakarma, Shushant Kumar, and Ratnesh Jamidar. 2026. “What Gets Cited: Competitive GEO in AI Answer Engines.” _Proceedings of the 49th International ACM SIGIR Conference on Research and Development in Information Retrieval_. [DOI: 10.1145/3805712.3808445](https://doi.org/10.1145/3805712.3808445). [Open-access version](https://arxiv.org/abs/2605.25517).

#### Experimental design

- 252,000 trials across six LLMs.
- Eighteen independently manipulated content factors.
- 100 product-review articles across 50 product categories.
- Matched pairs differing in one factor while holding facts and length approximately constant.
- Anonymized brands and publishers to reduce familiarity bias.
- Counterbalanced document order and repeated each condition five times.
- Logistic generalized linear mixed models with nested random effects.

#### Results

The strongest and most consistent effects were:

- On-topic rather than off-topic content.
- Earlier position in the supplied context.
- Explicit price information in the product domain.
- Recent rather than clearly stale timestamps.
- Technical specifications and deep coverage.
- Query-term coverage.
- Evidence supporting claims.
- Internal factual consistency.

Formatting-only results were substantially weaker:

- Structured versus dense presentation did not have a consistent cross-model effect.
- Organized versus scattered information produced smaller and model-dependent effects.
- Recent timestamps strongly beat a 2019 timestamp, but a recent timestamp only inconsistently beat having no timestamp.

#### Interpretation

This is strong causal evidence within a controlled two-document product-review setting. It supports relevance, completeness, evidence, and consistency more strongly than generic formatting rules.

The study does not model open-web retrieval, large citation pools, recognizable brand authority, or non-product domains. Its freshness result should not be generalized into a universal six- or nine-month cutoff.

### 5. Think Before Writing: Feature-Level Multi-Objective Optimization (FeatGEO)

**Status:** Peer-reviewed, ACL 2026 main conference.

**Citation:** Zikang Liu and Peilan Xu. 2026. “Think Before Writing: Feature-Level Multi-Objective Optimization for Generative Citation Visibility.” _Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics_, pages 20290–20303. [DOI: 10.18653/v1/2026.acl-long.929](https://doi.org/10.18653/v1/2026.acl-long.929). [Paper](https://aclanthology.org/2026.acl-long.929/).

#### Experimental design

- Used GEO-Bench's 10,000-query collection.
- Placed a target advertiser page alongside five retrieved webpages.
- Evaluated GPT-4o-mini, Gemini-2.5-flash, and Qwen-plus as generative engines.
- Compared the original GEO transformations, AutoGEO, and a feature-space multi-objective search method.
- Evaluated each candidate configuration five times.
- Measured both citation visibility and content quality.

#### Results

- Original token-level GEO transformations reduced visibility on already fluent, LLM-generated advertiser pages.
- On human-written competitor pages, the same heuristics produced only a 0.99 percentage-point average increase.
- Statistics Addition was the strongest original heuristic in that human-written setting, increasing visibility by 2.33 points.
- FeatGEO achieved relative visibility improvements of 37%, 73%, and 96% on the three controlled engines while maintaining or improving measured quality.

#### Interpretation

The paper shows that starting content quality changes whether a transformation helps or harms. It supports soft, adaptive feature optimization rather than hard universal thresholds.

The method is computationally expensive and uses repeated LLM generation and evaluation. It remains a controlled fixed-context experiment rather than a live-search field experiment.

### 6. Mind Reader: Latent User Demand-Guided Content Optimization

**Status:** Peer-reviewed, ACL 2026 main conference.

**Citation:** Tong Chen, JiaWei Guo, Yuxi Li, Baiming Chen, Houxing Ren, Zhang Zhiwei, Yunxiang Zhang, Hanyang Xia, Kun Liang, and Zhaoran Fan. 2026. “Mind Reader: Latent User Demand-Guided Content Optimization for Generative Search Engine.” _Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics_, pages 40832–40848. [DOI: 10.18653/v1/2026.acl-long.1894](https://doi.org/10.18653/v1/2026.acl-long.1894). [Paper](https://aclanthology.org/2026.acl-long.1894/).

#### Experimental design and results

Mind Reader decomposes a search query into latent semantic demands, generates query variants, and optimizes content to cover the reasoning and information required to answer those demands. On GEO-Bench and the authors' PC-GEO benchmark, the method reported up to 2.44 times improvement in objective metrics and 1.23 times improvement in subjective metrics relative to the evaluated baselines.

#### Interpretation

The paper supports query-dependent information coverage. It does not support question-framed H2s, fixed answer-capsule lengths, or generic FAQ formatting as substitutes for measuring whether a document actually satisfies the target query.

### 7. IF-GEO: Conflict-Aware Instruction Fusion for Multi-Query GEO

**Status:** Peer-reviewed, Findings of ACL 2026.

**Citation:** Heyang Zhou, Jiajia Chen, Xiaolu Chen, Jie Bao, Zhen Chen, and Yong Liao. 2026. “IF-GEO: Conflict-Aware Instruction Fusion for Multi-Query Generative Engine Optimization.” _Findings of the Association for Computational Linguistics: ACL 2026_, pages 27576–27590. [DOI: 10.18653/v1/2026.findings-acl.1373](https://doi.org/10.18653/v1/2026.findings-acl.1373). [Paper](https://aclanthology.org/2026.findings-acl.1373/).

#### Contribution

The paper demonstrates that edits beneficial for one query can conflict with those needed for other queries. Its method mines preferences for representative latent queries and fuses them into a constrained global revision plan. It also introduces stability metrics for measuring performance across a query set.

#### Interpretation

A page-level audit without an explicit target-query set cannot evaluate this conflict. This supports adding query coverage and cross-query stability to future versions of `aiseo-audit`.

### 8. From Experience to Skill: Multi-Agent GEO (MAGEO)

**Status:** Peer-reviewed, Findings of ACL 2026.

**Citation:** Beining Wu et al. 2026. “From Experience to Skill: Multi-Agent Generative Engine Optimization via Reusable Strategy Learning.” _Findings of the Association for Computational Linguistics: ACL 2026_, pages 43305–43315. [DOI: 10.18653/v1/2026.findings-acl.2149](https://doi.org/10.18653/v1/2026.findings-acl.2149). [Paper](https://aclanthology.org/2026.findings-acl.2149/).

#### Contribution

MAGEO uses planning, editing, and fidelity-aware evaluation agents to learn reusable, engine-specific optimization strategies. Experiments across three engines found that engine-specific preference modeling and strategy reuse improved both visibility and attribution fidelity relative to heuristic baselines.

#### Interpretation

The important evidence for this package is the value of engine-specific modeling and explicit citation fidelity. A successful audit should not reward visibility improvements that cause the generated answer to misattribute or distort the source.

### 9. Characterizing Web Search in the Age of Generative AI

**Status:** Peer-reviewed, Findings of ACL 2026.

**Citation:** Elisabeth Kirsten, Jost Große Perdekamp, Qinyuan Wu, Mihir Upadhyay, Krishna P. Gummadi, and Muhammad Bilal Zafar. 2026. “Characterizing Web Search in the Age of Generative AI.” _Findings of the Association for Computational Linguistics: ACL 2026_, pages 10827–10848. [DOI: 10.18653/v1/2026.findings-acl.526](https://doi.org/10.18653/v1/2026.findings-acl.526). [Paper](https://aclanthology.org/2026.findings-acl.526/).

#### Experimental design

- 4,706 queries across politics, products, science, general web search, and other datasets.
- Compared Google Organic Search with Google AI Overview, Gemini, two OpenAI search configurations, and Perplexity Sonar.
- Measured retrieval footprint, source composition, content coverage, and temporal stability.

#### Results

- Engines differed substantially in how many external sources they retrieved and which sources they selected.
- Google AI Overview consulted many sources outside the top 10 and top 100 organic results.
- For the same queries executed approximately two months apart, only 18% of AI Overview webpages were common between runs, compared with 45% for organic search.
- Depending on the engine, between 9% and 27% of certain answer decisions changed within five minutes.

#### Interpretation

Generative-search visibility is stochastic and time-dependent. A one-time deterministic audit should not be interpreted as a probability of citation without repeated outcome measurement and uncertainty estimates.

### 10. From Relevance to Authority: Authority-Aware Generative Retrieval

**Status:** Peer-reviewed, ACL 2026 Industry Track.

**Citation:** Sunkyung Lee, Jihye Back, Donghyeon Jeon, Soonhwan Kwon, Moonkwon Kim, Inho Kang, and Jongwuk Lee. 2026. “From Relevance to Authority: Authority-aware Generative Retrieval in Web Search Engines.” _Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics, Industry Track_, pages 796–811. [DOI: 10.18653/v1/2026.acl-industry.54](https://doi.org/10.18653/v1/2026.acl-industry.54). [Paper](https://aclanthology.org/2026.acl-industry.54/).

#### Contribution

The authors train a generative retriever to consider both relevance and authority. Offline evaluation, human evaluation, and a large-scale online A/B test on a commercial web-search platform showed improvements in authority, accuracy, reliability, and user engagement.

#### Interpretation

This supports authority as a legitimate retrieval-system objective. It does not establish that any particular page-level proxy—such as having an author name, contact link, or consistent Open Graph label—causes citation visibility. Those proxies require their own validation.

## Cross-Study Synthesis

### Findings with comparatively strong support

The following conclusions appear across multiple peer-reviewed studies or are supported by particularly strong controlled designs:

1. **Retrieval and context position are major visibility determinants.** A document cannot be cited if it never enters the generator's context, and earlier context positions often receive preferential treatment.
2. **Topical relevance must be measured relative to a query.** Query terms, semantic alignment, and coverage of the user's underlying information need consistently matter.
3. **Completeness and concrete evidence improve citation competitiveness.** Specifications, numerical facts, supported claims, comparisons, and deep coverage frequently outperform shallow or unsupported content.
4. **Factual consistency matters.** Internally contradictory or unsupported claims reduce trust and create attribution-risk problems.
5. **Structural fields and body content serve different roles.** Titles, headings, descriptions, entities, and metadata can support retrieval; detailed body text supplies evidence for synthesis and citation.
6. **Optimization is conditional.** Effects vary by engine, domain, query, starting document quality, retrieved competitors, and adoption by other publishers.
7. **Visibility is stochastic.** Scientific measurement should use repeated executions, multiple query formulations, and uncertainty reporting.

### Findings with conditional or limited support

- Adding statistics, references, or quotations can help when they add relevant evidence, but can be neutral or harmful when mechanically appended.
- Fresh content can beat clearly stale content for time-sensitive or product queries, but no reviewed experiment establishes a universal age cutoff.
- Clear organization and readability may help particular engines or content regimes, but their isolated causal effects are inconsistent.
- Authority is a meaningful retrieval objective, but the best observable page-level authority proxies remain unsettled.
- Adaptive rewriting can outperform static heuristics, but most evidence is still based on controlled RAG pipelines rather than longitudinal commercial-search experiments.

### Claims not established by the reviewed scientific literature

The reviewed papers do not validate the following as universal citation predictors:

- A 120–180 word section-length optimum.
- A 300–3,000 word page-length optimum.
- Question-framed H2 requirements.
- Answer capsules under a fixed character limit.
- Required counts of headings, lists, tables, quotations, or numerical claims.
- Fixed paragraph-length or sentence-length bands.
- `llms.txt` presence.
- Image alt text or `<figure>/<figcaption>` markup as textual citation-ranking signals.
- Particular schema types or schema-completeness fields as direct citation signals.
- A universal six- or nine-month freshness threshold.
- Equal importance for all audit categories.

Some of these remain good accessibility, usability, semantic HTML, or traditional SEO practices. That does not make them scientifically validated GEO ranking factors.

## Implications for `aiseo-audit`

The package currently evaluates seven categories and more than 30 factors defined in [`factor-names.ts`](../src/modules/audits/factor-names.ts). The literature supports reorganizing those factors around pipeline stages and evidence strength.

| Current area                                             | Scientific assessment                                           | Recommended treatment                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Fetch success and extraction                             | Operational prerequisite                                        | Retain as pass/fail technical eligibility, not a proportional citation predictor |
| AI crawler access                                        | Operationally important but crawler roles differ                | Separate search/indexing, user-triggered retrieval, and training controls        |
| `llms.txt`                                               | No peer-reviewed visibility evidence found                      | Report as experimental/informational; remove from default score                  |
| Image accessibility                                      | Strong accessibility rationale; GEO citation effect unvalidated | Retain as accessibility information unless a multimodal outcome is tested        |
| Headings and structural metadata                         | Supported primarily for retrieval                               | Retain, but measure relevance and coverage rather than fixed counts              |
| Lists, tables, paragraph bands, and exact section length | No general causal support                                       | Convert to unscored diagnostics or remove hard thresholds                        |
| Direct answers                                           | Early relevant claims have support                              | Measure query-specific answer coverage and prominence, not one capsule format    |
| Entities and topic consistency                           | Strong when evaluated against a query                           | Require a target query or query set; avoid page-only density targets             |
| References, statistics, and quotations                   | Conditional support                                             | Evaluate evidentiary relevance and fidelity rather than occurrence counts        |
| Author and organization context                          | Plausible authority proxies, not validated weights              | Keep as provenance checks with cautious weighting                                |
| Freshness                                                | Strong against clearly stale alternatives in some domains       | Make query/domain-sensitive; remove universal month bands                        |
| Structured data                                          | Structural fields can improve retrieval                         | Avoid claiming a direct citation boost for particular schema types               |
| Readability                                              | Conditional and starting-quality dependent                      | Use soft guidance rather than hard universal scoring thresholds                  |

## Recommended Scientific Scoring Architecture

A future evidence-aligned audit could report separate stage scores instead of one undifferentiated readiness score.

### 1. Technical eligibility

- Fetch and render success.
- Extractable primary content.
- Search-crawler eligibility.
- Canonical and indexability status.
- Availability of usable structural fields.

### 2. Query retrieval alignment

- Lexical and semantic similarity to a supplied query set.
- Coverage of important entities and subtopics.
- Structural-field alignment with the page's substantive content.
- Robustness across query paraphrases.

### 3. Citation and synthesis fitness

- Direct coverage of the user's information need.
- Concrete facts, specifications, definitions, comparisons, and procedures.
- Evidence relevance and verifiability.
- Internal consistency and absence of unsupported claims.
- Prominence of the main relevant claims.

### 4. Provenance and fidelity

- Clear authorship and organizational context.
- Traceable primary sources.
- Accurate attribution.
- Preservation of factual meaning during optimization.

### 5. Empirical visibility

- Repeated observations across engines.
- Multiple query formulations.
- Retrieval, citation, prominence, and factual absorption measured separately.
- Confidence intervals or stability ranges rather than a single deterministic prediction.

## Requirements for Calling the Score Scientifically Validated

Individual factors can be inspired by peer-reviewed research without the combined score being scientifically validated. Validating the `aiseo-audit` score would require an outcome study that:

1. Selects a large and diverse collection of held-out webpages.
2. Defines representative queries independently of the pages' audit results.
3. Measures retrieval, reranking, citation, prominence, factual absorption, and preferably downstream traffic.
4. Repeats measurements across engines, query paraphrases, and time.
5. Fits weights and thresholds on a training partition rather than assigning them manually.
6. Tests calibration and predictive performance on unseen pages.
7. Reports confidence intervals, uncertainty, missing-data handling, and engine-specific effects.
8. Repeats validation after significant model or search-system changes.

Until such a study exists, the numerical weights and thresholds should be described as expert-designed heuristics rather than research-derived probabilities.

## Implementation Note: Neutral Factors

This issue is independent of the research literature but affects interpretation of the current score.

Factors marked `neutral` still retain their maximum points in the category denominator. [`buildCategoryOutput`](../src/modules/audits/category.ts) sums all factor maximums, and [`maxFactors`](../src/modules/scoring/service.ts) does not exclude neutral factors. Consequently, pages without tables, images, `llms.txt`, question-framed H2s, or other nominally inapplicable elements can receive a lower category score even though the factor is labeled neutral.

Neutral or not-applicable factors should either:

- Be removed from the denominator, or
- Be explicitly described as scored absences rather than neutral observations.

## Research Maintenance Policy

When updating this document:

1. Record the venue and peer-review status for every source.
2. Link to the DOI, official proceedings, OpenReview page, or primary manuscript.
3. Describe the experimental unit, sample size, models, outcome metric, and controls.
4. Distinguish retrieved-context experiments from end-to-end search experiments.
5. State whether a result is causal, correlational, or descriptive.
6. Preserve domain and engine limitations when translating findings into recommendations.
7. Do not convert relative improvements from one experimental metric into universal citation-probability claims.
8. Keep industry observations in a separate section labeled non-peer-reviewed evidence.
