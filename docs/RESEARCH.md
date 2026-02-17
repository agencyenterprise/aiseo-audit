[< Back to README](../README.md)

# AI SEO Research & Gap Analysis

What the industry and academic research say about optimizing content for AI search engines, what actually moves the needle for AI citations, and where our audit tool has room to grow.

---

## Part 1: What The Research Says

### The Princeton GEO Paper (The Foundation)

The foundational academic work on GEO is [GEO: Generative Engine Optimization](https://arxiv.org/abs/2311.09735) by Aggarwal et al. from Princeton/IIT Delhi, presented at KDD 2024. This paper coined the term and established the field.

**Key findings from the study:**

| Optimization Method  | Visibility Boost (Word Count) | Visibility Boost (Impression) |
| -------------------- | ----------------------------- | ----------------------------- |
| Cite Sources         | 30-40%                        | 15-30%                        |
| Quotation Addition   | 30-40%                        | 15-30%                        |
| Statistics Addition  | 30-40%                        | 15-30%                        |
| Fluency Optimization | -                             | 15-30%                        |
| Easy-to-Understand   | -                             | 15-30%                        |

The most dramatic finding: **adding citations to content increased visibility by 115.1% for websites that were originally ranked 5th in traditional search**. Meanwhile, the top-ranked website's visibility actually _decreased_ by 30.3% in generative responses. GEO disproportionately helps content that isn't already dominant.

**Domain-specific insights:**

- Quotation Addition works best for People & Society, Explanation, and History content
- Statistics Addition works best for Law & Government and Opinion content
- Fluency and readability improvements had a broad positive effect across all domains

### What Gets Cited: The Data

Research from [Search Engine Land](https://searchengineland.com/how-to-get-cited-by-chatgpt-the-content-traits-llms-quote-most-464868) analyzing 8,000+ AI citations found clear patterns:

**Answer Capsules are the strongest signal.** 72.4% of blog posts cited by ChatGPT contained an identifiable "answer capsule" - a concise, self-contained explanation of 120-150 characters placed directly after a question-framed H2. This is the single most predictive formatting trait for getting cited.

**Answer-first formatting matters.** Placing the direct answer in the first 40-60 words of each section lets AI systems extract it without parsing introductory context. One study found this increased ChatGPT citations by 140%.

**Section length has a sweet spot.** Pages using 120-180 words between headings receive 70% more ChatGPT citations than pages with sections under 50 words. Too short and there's nothing to extract. Too long and it's hard to parse.

**Original data is the second-strongest differentiator.** First-party statistics, proprietary research, and unique datasets significantly increase citation likelihood across all platforms.

### Content Freshness: The Gate That Overrides Everything

Research from [Seer Interactive](https://www.seerinteractive.com/insights/study-ai-brand-visibility-and-content-recency) and [Ahrefs](https://ahrefs.com/blog/fresh-content/) shows freshness is a hard gate for AI citations:

- 65% of AI crawler hits target content published within the past year
- 79% target content from the last two years
- AI-cited content is **25.7% fresher** than what traditional Google ranks
- ChatGPT shows the strongest freshness bias, citing URLs that are **393-458 days newer** than Google organic results
- Content that used to stay relevant for 24-36 months now feels outdated in **6-9 months** for generative engines

The critical point: **authority without recency is rarely sufficient**. Even authoritative sources lose AI visibility when their facts are outdated.

### Platform-Specific Citation Patterns

Each generative engine has distinct citation preferences ([Profound](https://www.tryprofound.com/blog/ai-platform-citation-patterns)):

**ChatGPT:** Heavily favors Wikipedia, established media, .com domains. 76.4% of most-cited pages updated within 30 days. Strongest freshness bias.

**Perplexity:** Averages 6.61 citations per response (most citation-dense). Heavily concentrates on Reddit and YouTube. Emphasizes E-E-A-T signals. Real-time retrieval makes freshness especially critical.

**Claude:** Prioritizes content demonstrating clear reasoning. Responds well to step-by-step explanations and methodology sections. Values logical flow and "why/how" over just "what."

**Google AI Overviews:** More distributed across source types. Heavily weights E-E-A-T signals. Reddit and Medium disproportionately cited. Powered by Gemini, actively filtering generic AI-generated content.

**Cross-platform fragmentation:** Only ~11% of domains are cited by both ChatGPT and Perplexity.

### AI Crawler Access (robots.txt)

The baseline requirement for any GEO strategy:

| Crawler         | Owner      | Purpose                |
| --------------- | ---------- | ---------------------- |
| GPTBot          | OpenAI     | Training + retrieval   |
| ChatGPT-User    | OpenAI     | Live browsing requests |
| ClaudeBot       | Anthropic  | Training + retrieval   |
| PerplexityBot   | Perplexity | Real-time search index |
| Google-Extended | Google     | AI training data       |
| Googlebot       | Google     | Search + AI Overviews  |

If your robots.txt blocks these user agents, you don't exist to these engines.

### The llms.txt Standard

A new proposed standard ([llmstxt.org](https://llmstxt.org/)) is emerging alongside robots.txt. The llms.txt file is a markdown document at your site's root providing AI systems with a structured overview of your content, purpose, and key resources. OpenAI, Microsoft, and others are actively crawling these files.

### Multimodal AI Readiness (Image Accessibility)

The [AIVO Standard v2.2](https://aivojournal.com/standard/) (2025) establishes a canonical framework for multi-modal AI visibility. As models like Gemini 2.5 and GPT-4o directly ingest images alongside text, image metadata becomes a first-class signal for AI grounding.

**Key findings:**

- Multimodal models use `alt` attributes and `<figcaption>` text to understand what an image depicts and how it relates to surrounding content
- Images without alt text are content that AI cannot understand, reference, or cite
- Semantic image markup (`<figure>` with `<figcaption>`) provides richer context than alt text alone
- The AIVO Standard positions image readiness alongside text readiness as a core AI visibility requirement

### Schema Completeness (Beyond Presence)

Research from [Semrush](https://www.semrush.com/blog/content-optimization-for-ai-search/) and [WebFX](https://www.webfx.com/blog/seo/structured-data-ai-citations/) shows that LLMs use schema completeness to ground citations, not just schema presence. An `Article` schema with only `@type` does almost nothing. The same schema with `headline`, `author`, and `datePublished` gives models grounding confidence.

**Key findings:**

- LLMs parse JSON-LD to verify authorship, publication dates, and content type before citing
- Incomplete schemas are treated similarly to absent schemas by citation models
- The most impactful properties vary by type: `Article` needs `headline`/`author`/`datePublished`, `FAQPage` needs `mainEntity`, `HowTo` needs `name`/`step`
- Schema completeness acts as a trust multiplier on other authority signals

### Brand Entity Consistency

The [KnewSearch 2026 AI Search Visibility Benchmark](https://knewsearch.com/benchmark-report) found that brand-controlled sources account for approximately 86% of AI citations. The defining characteristic of a "brand-controlled" source is consistent entity identification across multiple page surfaces.

**Key findings:**

- AI models resolve brand identity by cross-referencing entity names across title, OG tags, JSON-LD schema, and footer/header
- Inconsistent entity naming (e.g., "Acme Corp" in the title but "Acme" in the footer and "Acme Corporation" in schema) reduces citation confidence
- Pages where the brand name appears consistently across 4+ surfaces are significantly more likely to be cited as authoritative sources
- Entity consistency is especially important for branded queries where multiple competing sources exist

---

## Part 2: Emerging Best Practices (Consensus View)

### Tier 1: Non-Negotiable

1. **AI Crawler Access** - Don't block GPTBot, ClaudeBot, PerplexityBot, Google-Extended in robots.txt
2. **Content Freshness** - Publish/modified dates must be visible, crawlable, and honest. Update every 6-9 months minimum
3. **Answer-First Formatting** - Direct answer in first 40-60 words after every question-framed heading

### Tier 2: High Impact (Princeton paper's top methods)

4. **Cite Sources** - External authoritative links with formal citation patterns (+115% visibility)
5. **Include Statistics** - First-party data, specific numbers, percentages, quantitative claims
6. **Add Quotations** - Expert quotes with attribution

### Tier 3: Structural (Makes content extractable)

7. **Heading Hierarchy** - One H1, question-framed H2s, H3 sub-topics, 120-180 words per section
8. **Structured Data** - JSON-LD schema markup, Open Graph tags, canonical URLs
9. **Schema Completeness** - JSON-LD types with all recommended properties populated (not just present)
10. **Lists and Tables** - Easiest content formats for AI to extract verbatim
11. **Section Structure** - Short paragraphs (30-150 words), bold key phrases, definition patterns
12. **Image Accessibility** - Alt text on all images, semantic `<figure>`/`<figcaption>` markup

### Tier 4: Authority Signals

13. **Author Attribution** - Visible bylines with credentials and schema markup
14. **Organization Identity** - Organization schema, og:site_name, About/Contact pages
15. **Entity Consistency** - Brand name appears consistently across title, OG tags, schema, footer
16. **E-E-A-T Signals** - First-hand experience, original visuals, credentials
17. **Cross-Platform Presence** - Mentions across Reddit, LinkedIn, YouTube increase citations 2.8x

### Tier 5: Emerging

18. **llms.txt** - Markdown file at site root for AI inference optimization
19. **Content Clusters** - Pillar pages with 3-7 supporting articles, interlinked

---

## Sources

- [GEO: Generative Engine Optimization (Princeton/KDD 2024)](https://arxiv.org/abs/2311.09735)
- [How to Get Cited by ChatGPT: Content Traits LLMs Quote Most (Search Engine Land)](https://searchengineland.com/how-to-get-cited-by-chatgpt-the-content-traits-llms-quote-most-464868)
- [AI Platform Citation Patterns (Profound)](https://www.tryprofound.com/blog/ai-platform-citation-patterns)
- [Study: AI Brand Visibility and Content Recency (Seer Interactive)](https://www.seerinteractive.com/insights/study-ai-brand-visibility-and-content-recency)
- [Fresh Content: Why Publish Dates Make or Break Rankings (Ahrefs)](https://ahrefs.com/blog/fresh-content/)
- [LLM-Friendly Content: 12 Tips to Get Cited (Onely)](https://www.onely.com/blog/llm-friendly-content/)
- [Understanding AI Crawlers (Qwairy)](https://www.qwairy.co/blog/understanding-ai-crawlers-complete-guide)
- [The llms.txt Specification (llmstxt.org)](https://llmstxt.org/)
- [AIVO Standard v2.2: Multi-Modal AI Visibility Framework (AIVO Journal)](https://aivojournal.com/standard/)
- [How We Built a Content Optimization Tool for AI Search (Semrush)](https://www.semrush.com/blog/content-optimization-for-ai-search/)
- [How Structured Data Helps Your Brand Get Cited in AI Results (WebFX)](https://www.webfx.com/blog/seo/structured-data-ai-citations/)
- [2026 AI Search Visibility Benchmark Report (KnewSearch)](https://knewsearch.com/benchmark-report)
