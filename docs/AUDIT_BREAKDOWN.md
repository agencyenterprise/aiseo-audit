[< Back to README](../README.md)

# Audit Breakdown

How every audit category works, what it measures, how it scores, and how the code is structured behind it.

---

## Table of Contents

- [How Scoring Works](#how-scoring-works)
- [1. Content Extractability](#1-content-extractability)
- [2. Content Structure for Reuse](#2-content-structure-for-reuse)
- [3. Answerability](#3-answerability)
- [4. Entity Clarity](#4-entity-clarity)
- [5. Grounding Signals](#5-grounding-signals)
- [6. Authority Context](#6-authority-context)
- [7. Readability for Compression](#7-readability-for-compression)
- [Grading Scale](#grading-scale)
- [Code Architecture](#code-architecture)
- [Sources](#sources)

---

## How Scoring Works

Each of the 7 audit categories contains multiple **factors**. Every factor produces a score from `0` to its `maxScore`.

```
Category Score = sum of all factor scores in that category
Category Max   = sum of all factor maxScores in that category
Category %     = (Category Score / Category Max) * 100
```

The **overall score** (0-100) is a weighted average of all 7 category percentages. By default all categories are weighted equally. You can change weights in `aiseo.config.json`:

```json
{
  "weights": {
    "contentExtractability": 2,
    "answerability": 1.5,
    "entityClarity": 0.5
  }
}
```

Weights are relative. A category with weight `2` counts twice as much as one with weight `1`. Setting a weight to `0` excludes that category entirely.

---

## 1. Content Extractability

**Question:** Can a generative engine successfully fetch this page and pull out meaningful text?

This is the baseline. If the content can't be fetched or extracted, nothing else matters.

### Factors

| Factor                  | Max | What It Measures                                                             |
| ----------------------- | --- | ---------------------------------------------------------------------------- |
| Fetch Success           | 12  | Did the HTTP request return a 200?                                           |
| Text Extraction Quality | 12  | Ratio of clean text bytes to raw HTML bytes                                  |
| Boilerplate Ratio       | 12  | How much of the page is nav/footer/scripts vs actual content                 |
| Word Count Adequacy     | 12  | Is there enough text to be useful (sweet spot: 300-3000 words)               |
| AI Crawler Access       | 10  | Are GPTBot, ClaudeBot, PerplexityBot, Google-Extended allowed in robots.txt? |
| LLMs.txt Presence       | 6   | Does the domain have llms.txt and/or llms-full.txt at the root?              |
| Image Accessibility     | 8   | Do images have alt text? Are figure/figcaption patterns used?                |

### Scoring Details

**Fetch Success**

- HTTP 200 = 12 points
- HTTP 2xx/3xx (redirects that resolve) = 8 points
- HTTP 4xx+ = 0 points

**Text Extraction Quality** measures the ratio `cleanTextLength / rawByteLength`:

- 5-15% = 12 (ideal for a normal web page)
- 1-5% = 8
- Above 15% = 10 (text-heavy, fine but less structured)
- Below 1% = 2 (mostly binary or non-text content)

**Boilerplate Ratio** is computed by removing entire DOM elements (including all nested children) that match the boilerplate selectors, then comparing the cleaned text length to the raw text length. The full removal list:

- HTML elements: `<script>`, `<style>`, `<noscript>`, `<svg>`, `<iframe>`, `<nav>`, `<header>`, `<footer>`, `<aside>`
- ARIA roles: `[role="navigation"]`, `[role="banner"]`, `[role="contentinfo"]`
- Class/ID selectors: `.sidebar`, `#sidebar`, `.nav`, `.navbar`, `.footer`, `.header`, `.menu`, `.ad`, `.ads`, `.advertisement`
- Cookie/consent patterns: `.cookie-banner`, `#cookie-consent`, `.cookie-notice`, `[class*="cookie"]`, `[class*="consent"]`
- Overlay patterns: `[class*="popup"]`, `[class*="modal"]`

Scoring:

- Less than 30% boilerplate = 12
- 30-50% = 9
- 50-70% = 6
- Over 70% = 2

**Word Count Adequacy**:

- 300-3000 words = 12 (ideal range for generative reuse)
- 100-299 = 8
- Over 3000 = 10 (lengthy but still usable)
- Under 100 = 2 (too thin to be useful)

**AI Crawler Access** fetches the domain's `/robots.txt` and checks whether 5 major AI crawlers are blocked:

- GPTBot, ChatGPT-User (OpenAI)
- ClaudeBot (Anthropic)
- PerplexityBot (Perplexity)
- Google-Extended (Google AI training)

Scoring: 0 blocked = 10, 1-2 blocked = 6, 3-4 blocked = 3, all blocked = 0

**LLMs.txt Presence** checks for an emerging standard [[8]](#sources) that is gaining traction alongside robots.txt. Unlike robots.txt (which controls access), llms.txt is a curated roadmap that helps AI systems understand your site's content, purpose, and key resources at inference time. OpenAI, Microsoft, and other major providers are actively crawling for these files. No major LLM has confirmed it as a ranking signal yet, but adoption is low-cost and forward-looking.

Two files are checked at the domain root:

- `/llms.txt` - a markdown document providing AI systems with a structured overview of the site's content and key pages
- `/llms-full.txt` - a comprehensive version with full content for deeper ingestion

Scoring: both found = 6, one found = 4, neither = 0 (scored as `neutral`)

**Image Accessibility** checks whether images have meaningful alt text and use semantic markup. Multimodal AI models (Gemini 2.5, GPT-4o) directly ingest images and rely on structured metadata for grounding. The AIVO Standard v2.2 establishes image readiness as a first-class AI visibility signal [[7]](#sources).

Two sub-checks:

1. Alt text coverage: what ratio of `<img>` elements have a non-empty `alt` attribute?
2. Semantic captions: are any images wrapped in `<figure>` with a `<figcaption>` child?

Scoring:

- 90%+ images have alt text = +5, 50-89% = +3, under 50% = +1
- Any `<figcaption>` elements present = +3
- No images on page = 0 (scored as `neutral`)

### Why This Matters

Generative engines start by fetching your page and extracting its text. If your page is slow to respond, returns errors, is mostly boilerplate, or has almost no content, it's effectively invisible. Beyond the page itself, AI crawlers need permission to access your content via robots.txt - blocking them means you don't exist to generative engines. The llms.txt standard is an emerging way to proactively help AI systems understand your site. As multimodal models become standard (Gemini 2.5, GPT-4o), image accessibility also matters - images without alt text are content that AI cannot understand or reference. This category is the foundation everything else builds on.

---

## 2. Content Structure for Reuse

**Question:** Is the content organized in a way that engines can segment, chunk, and reuse?

This category is purely structural. It checks whether the right HTML elements exist, in the right quantities, at the right sizes. It does not evaluate the quality of what's inside them. Content quality is assessed separately: [Answerability](#3-answerability) checks whether the text contains answer patterns and definitions, [Entity Clarity](#4-entity-clarity) checks for named entities, [Grounding Signals](#5-grounding-signals) checks for citations and evidence, and [Readability for Compression](#7-readability-for-compression) checks sentence structure and vocabulary.

### Factors

| Factor              | Max | What It Measures                                        |
| ------------------- | --- | ------------------------------------------------------- |
| Heading Hierarchy   | 11  | H1/H2/H3 presence and nesting                           |
| Lists Presence      | 11  | Bulleted and numbered list items                        |
| Tables Presence     | 8   | Data tables on the page                                 |
| Paragraph Structure | 11  | Paragraph count and average length                      |
| Scannability        | 11  | Bold text, short paragraphs, heading-to-paragraph ratio |
| Section Length      | 12  | Average word count between consecutive headings         |

### Scoring Details

**Heading Hierarchy** awards points additively:

- Exactly 1 H1 = +4 (multiple H1s = +2)
- 2+ H2s = +4 (1 H2 = +2)
- Any H3s = +3

**Lists Presence** counts total `<li>` elements:

- 10+ items = 11
- 5-9 items = 8
- 1-4 items = 4
- None = 0

**Tables Presence** counts `<table>` elements:

- 2+ tables = 8
- 1 table = 5
- No tables = 0 (scored as `neutral`, not penalized)

**Paragraph Structure** looks at average words per paragraph:

- 30-150 words/paragraph = 11 (ideal)
- 1-199 words = 7
- Over 200 or 0 = 2

**Scannability** is a composite of three sub-checks:

- Bold text (`<strong>` or `<b>`) present = +4
- Average paragraph length <= 150 words = +4
- Heading-to-paragraph ratio >= 0.1 = +3

**Section Length** measures the average number of words between consecutive heading elements (H1-H6). Pages using 120-180 words between headings receive 70% more AI citations [[1]](#sources):

- 120-180 words = 12 (sweet spot)
- 80-119 or 181-250 words = 8 (acceptable)
- Outside those ranges = 4 (too short or too long)
- No headed sections = 0 (scored as `neutral`)

### Why This Matters

Generative engines don't use your whole page as one blob. They chunk it by headings, extract lists as standalone snippets, and pull table data into structured answers. Each section between headings is a potential extractable unit. 120-180 words per section is the citation sweet spot [[1]](#sources). Pages that are one giant wall of text with no structural markers give engines very little to work with.

---

## 3. Answerability

**Question:** Does this content directly answer the kinds of questions people ask generative engines?

### Factors

| Factor                   | Max | What It Measures                                          |
| ------------------------ | --- | --------------------------------------------------------- |
| Definition Patterns      | 10  | Phrases like "X is defined as...", "X refers to..."       |
| Direct Answer Statements | 11  | Sentences that start with declarative statements          |
| Answer Capsules          | 13  | Concise answers immediately after question-framed H2s     |
| Step-by-Step Content     | 10  | Numbered steps, ordered lists, "how to" patterns          |
| Q/A Patterns             | 11  | Questions in content + "what is", "how to" query patterns |
| Summary/Conclusion       | 9   | "In summary", "key takeaways", "TL;DR" markers            |

### Scoring Details

**Definition Patterns** scans for these regex patterns:

- `is defined as`
- `refers to`
- `means that`
- `is a type of`
- `can be described as`
- `also known as`

Scoring: 6+ matches = 10, 3-5 = 7, 1-2 = 4, none = 0

**Direct Answer Statements** scans for:

- Lines starting with `The [word] is...`
- Lines starting with `It is...`, `This is...`, `They are...`
- Phrases: `simply put`, `in short`

Scoring: 5+ = 11, 2-4 = 8, 1 = 4, none = 0

**Answer Capsules** detects the "answer capsule" pattern: 72% of AI-cited content has a concise answer (under 200 characters) placed immediately after a question-framed H2 [[1]](#sources). The check:

1. Finds all H2 elements framed as questions (contains `?` or starts with what/how/why/when/where/which/who/can/do/does/is/are/should/will)
2. Gets the first `<p>` element after each question H2
3. Checks if the first sentence of that paragraph is <= 200 characters (a concise answer capsule)
4. Scores based on the ratio of question H2s with proper capsules

Scoring: 70%+ have capsules = 13, 40-69% = 9, some = 5, question H2s but no capsules = 2, no question H2s = 0 (scored as `neutral`)

**Step-by-Step Content** scans for:

- `step 1`, `step 2`, etc.
- Lines starting with `1. `, `2. `, etc.
- `firstly`, `secondly`, `finally`
- `how to`
- Presence of `<ol>` elements (adds +2 to count)

Scoring: 5+ = 10, 2-4 = 7, 1 = 3, none = 0

**Q/A Patterns** combines two counts:

1. Sentences ending in `?` (question marks in content)
2. Query pattern matches: `what is`, `what are`, `how to`, `how do`, `why is`, `why do`, `when to`, `where to`, `which is`, `who is`

Sum of both counts is scored: 10+ = 11, 5-9 = 8, 2-4 = 5, 1 = 2, none = 0

**Summary/Conclusion** scans for:

- `in summary`, `in conclusion`, `to summarize`
- `key takeaways`, `bottom line`, `TL;DR`

Scoring: 2+ = 9, 1 = 5, none = 0

### Why This Matters

When someone asks ChatGPT "what is X?" or "how do I do Y?", the engine looks for content that directly answers that question. Pages that define terms, provide step-by-step instructions, and include Q/A sections give engines ready-made answer material. The answer capsule pattern is the single most predictive formatting trait for AI citations. 72% of cited content uses it and answer-first formatting increased citations by 140% [[1]](#sources).

---

## 4. Entity Clarity

**Question:** Does this content contain clear, recognizable entities that engines can use to understand what it's about?

This category uses [compromise](https://github.com/spencermountain/compromise) for natural language entity extraction. No external APIs.

### Factors

| Factor            | Max | What It Measures                                               |
| ----------------- | --- | -------------------------------------------------------------- |
| Entity Richness   | 20  | Total unique entities extracted (people, orgs, places, topics) |
| Topic Consistency | 25  | Do extracted topics align with the page title and H1?          |
| Entity Density    | 15  | Entities per 100 words (sweet spot: 2-8)                       |

### Scoring Details

**Entity Richness** counts total unique entities across all types:

- 9+ entities = 20
- 4-8 = 14
- 1-3 = 7
- None = 0 (scored as `neutral`)

**Topic Consistency** extracts keywords from the page `<title>` and `<h1>` (words > 3 characters), then checks how many of those keywords appear among the extracted topic entities or are repeated frequently (3+ occurrences) in the body text:

- 50%+ of title/H1 keywords found in topics = 25
- Some overlap = 15
- No overlap = 5

**Entity Density** is `(totalEntities / wordCount) * 100`:

- 2-8 per 100 words = 15 (ideal)
- 1-2 or 8+ = 10
- Below 1 = 3

### Why This Matters

Generative engines build knowledge graphs internally. When your page mentions specific people, companies, locations, and topics by name, engines can place your content in context and connect it to queries about those entities. Vague content that avoids naming anything specific is hard for engines to anchor to any particular query.

---

## 5. Grounding Signals

**Question:** Does this content back up its claims with external evidence?

### Factors

| Factor                 | Max | What It Measures                               |
| ---------------------- | --- | ---------------------------------------------- |
| External References    | 13  | Links to other domains                         |
| Citation Patterns      | 13  | Formal citation indicators + blockquotes       |
| Numeric Claims         | 13  | Percentages, dollar amounts, statistics        |
| Attribution Indicators | 11  | "according to", "said", "reported" phrases     |
| Quoted Attribution     | 10  | Quotes explicitly attributed to a named source |

### Scoring Details

**External References** counts `<a>` elements linking to domains other than the page's own domain:

- 6+ external links = 13
- 3-5 = 10
- 1-2 = 6
- None = 0

**Citation Patterns** combines two counts:

1. Text pattern matches: `[1]`, `(Author 2024)`, `according to`, `research shows`, `studies indicate`, `data from`, `as reported by`
2. HTML elements: `<blockquote>`, `<cite>`, `<q>`

Sum scored: 6+ = 13, 3-5 = 9, 1-2 = 5, none = 0

**Numeric Claims** scans for:

- Percentages: `42%`
- Large numbers: `3 million`, `2 billion`
- Currency: `$1,200`
- Change indicators: `increased by`, `decreased by`, `grew by`

Scoring: 9+ = 13, 4-8 = 9, 1-3 = 5, none = 0

**Attribution Indicators** scans for:

- `according to`
- `said`, `stated`, `reported`
- `cited by`

Scoring: 5+ = 11, 2-4 = 8, 1 = 4, none = 0

**Quoted Attribution** specifically detects the quote-with-attribution pattern that boosts visibility by 30-40% [[2]](#sources). Combines two checks:

1. Text patterns for inline quoted attribution:
   - `"quoted text" - Name` (straight or curly quotes, em/en dashes)
   - `"quoted text," said Name`
   - `"quoted text," according to Name`
   - `According to Name, "quoted text"`

2. HTML `<blockquote>` elements containing a `<cite>`, `<footer>`, or `<figcaption>` child (properly attributed quotes)

Scoring: 4+ attributed quotes = 10, 2-3 = 7, 1 = 4, none = 0 (scored as `neutral`)

### Why This Matters

Generative engines are increasingly focused on grounding their responses in verifiable sources. Content that cites external references, includes statistics, and attributes claims to specific sources is more trustworthy to engines. Quotes with explicit attribution are especially powerful. The Princeton GEO paper ranked quotation addition alongside statistics and citations as the top methods for increasing generative visibility [[2]](#sources).

---

## 6. Authority Context

**Question:** Does this page provide the contextual signals that help engines evaluate who created it and whether to trust it?

### Factors

| Factor                | Max | What It Measures                                              |
| --------------------- | --- | ------------------------------------------------------------- |
| Author Attribution    | 10  | Byline, author meta tags, schema markup                       |
| Organization Identity | 10  | Organization schema, og:site_name                             |
| Contact/About Links   | 10  | Links to /about, /contact, /team pages                        |
| Publication Date      | 8   | Publish/modified dates in HTML or schema (presence check)     |
| Content Freshness     | 12  | How recent is the publication or modified date?               |
| Structured Data       | 12  | JSON-LD, Open Graph tags, canonical URL                       |
| Schema Completeness   | 10  | Do JSON-LD schemas have their recommended properties?         |
| Entity Consistency    | 10  | Does the brand name appear consistently across page surfaces? |

### Scoring Details

**Author Attribution** checks these CSS selectors in order:

- `[rel="author"]`, `.author`, `.byline`, `[itemprop="author"]`
- `.post-author`, `.entry-author`, `meta[name="author"]`

Found = 10, not found = 0

**Organization Identity** checks for:

- `"@type": "Organization"` in JSON-LD
- `<meta property="og:site_name">` with content

Either found = 10, neither = 0

**Contact/About Links** checks for `<a>` elements whose `href` contains `about`, `team`, `company`, or `contact`:

- Both about-type AND contact found = 10
- One of the two = 5
- Neither = 0

**Publication Date** checks these selectors in order (presence only):

- `<time datetime>`, `[itemprop="datePublished"]`, `[itemprop="dateModified"]`
- `.published`, `.post-date`, `.entry-date`
- `meta[property="article:published_time"]`, `meta[property="article:modified_time"]`

Found = 8, not found = 0

**Content Freshness** goes beyond date presence to evaluate how recent the content actually is. 65% of AI crawler hits target content less than 1 year old, and freshness acts as a hard gate: stale content loses visibility regardless of quality [[3]](#sources).

The check:

1. Looks for `dateModified` first (stronger signal), then falls back to `datePublished`
2. Parses the date and calculates age in months from today
3. Having a `dateModified` at all provides a +2 bonus (shows active maintenance)

Scoring:

- Under 6 months old = 12 (fresh, ideal)
- 6-12 months = 9 (still current)
- 12-24 months = 5 (getting stale)
- Over 24 months = 2 (outdated for generative engines)
- Modified date present bonus: +2 (capped at 12)
- No parseable date = 0

**Structured Data** awards points additively:

- JSON-LD `<script type="application/ld+json">` with `@type` present = +4
- 3+ Open Graph tags (og:title, og:description, og:image, og:type) = +4 (1-2 tags = +2)
- `<link rel="canonical">` present = +4

**Schema Completeness** goes beyond schema presence to evaluate whether recognized JSON-LD types have their recommended properties populated. LLMs use schema completeness to ground citations, not just presence [[4]](#sources) [[5]](#sources).

Recognized types and their recommended properties:

- `Article` / `NewsArticle` / `BlogPosting`: `headline`, `author`, `datePublished`
- `FAQPage`: `mainEntity`
- `HowTo`: `name`, `step`
- `Organization`: `name`, `url`
- `LocalBusiness`: `name`, `address`
- `Product`: `name`
- `WebPage`: `name`

For each recognized schema, the check computes what percentage of recommended properties are present, then averages across all schemas on the page.

Scoring:

- 80%+ average completeness = 10
- 50-79% = 7
- Under 50% (but some properties) = 4
- No recognized schema types = 0 (scored as `neutral`)

**Entity Consistency** checks whether the brand or organization name appears consistently across multiple page surfaces. Brand-controlled sources account for ~86% of AI citations, and consistent entity identification is what makes a source "brand-controlled" to a model [[6]](#sources).

The check:

1. Resolves the entity name from `og:site_name` or `Organization` schema `name` or `publisher.name`
2. Checks 4 surfaces for the entity name: page title, OG title, footer text, header/copyright text
3. Scores based on how many surfaces contain the name

Scoring:

- 4/4 surfaces = 10
- 3/4 = 7
- 2/4 = 4
- 1/4 = 2
- No identifiable entity name = 0 (scored as `neutral`)

### Why This Matters

When a generative engine decides which sources to cite or pull from, context matters. Who wrote it? What organization published it? When was it last updated? Is there structured data that makes the content machine-readable? Content freshness is especially critical. ChatGPT cites URLs that are 393-458 days newer than what Google ranks organically, and content lifespans have compressed from 24-36 months to 6-9 months for generative engines [[3]](#sources). Beyond presence, schema completeness matters. An Article schema with `headline`, `author`, and `datePublished` gives models far more grounding confidence than an empty shell [[4]](#sources) [[5]](#sources). Brand-controlled sources dominate AI citations (~86%) [[6]](#sources). Consistent entity naming across title, OG tags, schema, and footer is what makes a source "brand-controlled" to a model.

---

## 7. Readability for Compression

**Question:** Is this content written in a way that compresses well when engines summarize it?

### Factors

| Factor           | Max | What It Measures                               |
| ---------------- | --- | ---------------------------------------------- |
| Sentence Length  | 15  | Average words per sentence (sweet spot: 12-22) |
| Readability      | 15  | Flesch Reading Ease score                      |
| Jargon Density   | 15  | Percentage of 4+ syllable words                |
| Transition Usage | 15  | Variety of transition words used               |

### Scoring Details

**Sentence Length** computes `totalWords / totalSentences`:

- 12-22 words/sentence = 15 (ideal)
- 8-11 or 23-29 = 10
- Anything else (but > 0) = 5
- No sentences = 0

**Readability** uses the Flesch Reading Ease formula:

```
FRE = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
```

Scoring:

- FRE 60-70 = 15 (ideal for broad audiences)
- FRE > 70 = 13 (very easy, good)
- FRE 50-59 = 10
- FRE 30-49 = 6
- FRE < 30 = 3 (very difficult to read)

Syllable counting uses a heuristic: count vowel groups, adjust for silent-e and common suffixes.

**Jargon Density** is the ratio of complex words (4+ syllables) to total words:

- Under 2% = 15 (very accessible)
- 2-5% = 12
- 5-10% = 8
- Over 10% = 3

**Transition Usage** counts how many distinct transition words from a list of 20 appear in the text:

- `however`, `therefore`, `moreover`, `furthermore`, `consequently`, `additionally`, `in contrast`, `similarly`, `as a result`, `for example`, `for instance`, `on the other hand`, `nevertheless`, `meanwhile`, `likewise`, `in addition`, `specifically`, `in particular`, `notably`, `importantly`

Scoring: 10+ types = 15, 5-9 = 11, 2-4 = 7, 1 = 3, none = 0

### Why This Matters

Generative engines don't quote your content verbatim - they compress, summarize, and rephrase it. Content that uses clear sentence structure, accessible vocabulary, and logical transitions compresses cleanly. Dense academic prose with 40-word sentences and heavy jargon is harder for engines to distill into useful answers without losing meaning.

---

## Grading Scale

| Score  | Grade |
| ------ | ----- |
| 95-100 | A+    |
| 90-94  | A     |
| 85-89  | A-    |
| 80-84  | B+    |
| 75-79  | B     |
| 70-74  | B-    |
| 65-69  | C+    |
| 60-64  | C     |
| 55-59  | C-    |
| 45-54  | D     |
| 0-44   | F     |

---

## Code Architecture

### Pipeline

When you run `aiseo-audit https://example.com`, here's exactly what happens:

```
cli.ts                          parses args with commander
  |
  v
config/service.ts               loads aiseo.config.json (if present), merges defaults via Zod
  |
  v
analyzer/service.ts             orchestrates the full pipeline:
  |
  +---> fetcher/service.ts      axios GET -> raw HTML, status code, timing
  |
  +---> fetchDomainSignals()    parallel fetch: robots.txt, llms.txt, llms-full.txt
  |
  +---> extractor/service.ts    cheerio.load -> clean text, stats, $ instance
  |
  +---> audits/service.ts       runs all 7 categories against extracted page + domain signals
  |
  +---> scoring/service.ts      weighted average of category scores -> grade
  |
  +---> recommendations/        generates actionable recs from low-scoring factors
  |     service.ts
  |
  v
report/service.ts               renders output (pretty, json, or markdown)
  |
  v
stdout                          (or --out file.json)
```

### Module Pattern

Every module follows the same structure:

```
module/
  schema.ts       Zod schemas + inferred TypeScript types
  service.ts      Pure business logic (throws on failure)
  constants.ts    Thresholds, config defaults, display names
  support/        Private helpers only used inside this module
```

**Schemas** define the contract. Types are always derived from Zod via `z.infer<>`, never hand-written interfaces (except when wrapping non-serializable objects like Cheerio's `$`).

**Services** contain the actual logic. They take validated inputs, do work, and return typed results. They throw on failure - error handling lives in the CLI entry point.

### Audits Module in Detail

The audits module is the largest and most important module. Here's how it's organized:

```
audits/
  schema.ts              CategoryResult, FactorResult, AuditResult, AuditRawData types
  service.ts             runAudits() orchestrator - imports and calls all 7 category audits
  constants.ts           CATEGORY_DISPLAY_NAMES
  categories/
    content-extractability.ts   auditContentExtractability()
    content-structure.ts        auditContentStructure()
    answerability.ts            auditAnswerability()
    entity-clarity.ts           auditEntityClarity()
    grounding-signals.ts        auditGroundingSignals()
    authority-context.ts        auditAuthorityContext()
    readability.ts              auditReadabilityForCompression()
  support/
    patterns.ts          All regex patterns (definitions, citations, steps, etc.)
    scoring.ts           Scoring utilities (thresholdScore, makeFactor, etc.)
    language.ts          NLP helpers (compromise entities, Flesch, syllables, schema, entity)
```

**`service.ts`** exports a single function `runAudits(page, fetchResult, domainSignals?)` that imports and calls the 7 category audit functions. Each returns a `CategoryAuditOutput` containing both its category result and its typed raw diagnostic data:

```
auditContentExtractability(page, fetchResult, domainSignals)
auditContentStructure(page)
auditAnswerability(page)
auditEntityClarity(page)
auditGroundingSignals(page)
auditAuthorityContext(page)
auditReadabilityForCompression(page)
```

`runAudits` is the single merge point - it sets the base `rawData` fields (`title`, `metaDescription`, `wordCount`) from the page, then spreads each audit function's partial raw data together into a typed `AuditRawDataType`. No audit function mutates external state.

The `domainSignals` parameter contains robots.txt content and llms.txt/llms-full.txt existence flags, fetched by the analyzer orchestrator before audits run.

Each audit function follows the same pattern:

1. Create an empty `factors[]` array
2. Run each check, push a `FactorResult` via `makeFactor(name, score, maxScore, value)`
3. Return a `CategoryAuditOutput` with the category result and any diagnostic raw data

**`support/patterns.ts`** centralizes every regex pattern used across all audits. This means all detection logic lives in one place. If you want to add a new citation pattern or definition phrase, you edit one file.

**`support/scoring.ts`** provides small scoring utilities:

- `thresholdScore(value, brackets)` - maps a numeric value to a score using descending threshold brackets
- `makeFactor(name, score, max, value)` - builds a `FactorResult` and auto-assigns status (`good` >= 70%, `needs_improvement` >= 30%, `critical` < 30%)
- `sumFactors(factors)` / `maxFactors(factors)` - add up scores/maxScores

**`support/language.ts`** wraps the NLP dependencies and analysis helpers:

- `extractEntities(text)` - uses `compromise` to pull out people, organizations, places, topics
- `computeFleschReadingEase(text)` - standard Flesch formula using heuristic syllable counting
- `countComplexWords(text)` - words with 4+ syllables
- `countPatternMatches(text, patterns)` - runs an array of regex patterns against text, sums all match counts
- `countTransitionWords(text, words)` - counts how many distinct transition words appear
- `detectAnswerCapsules($)` - finds question-framed H2s and checks for concise answer paragraphs
- `evaluateFreshness($)` - parses dateModified/datePublished and calculates content age in months
- `measureSectionLengths($)` - walks DOM to count words between consecutive headings
- `checkCrawlerAccess(robotsTxt)` - parses robots.txt for AI crawler allow/block status
- `parseJsonLdObjects($)` - extracts all JSON-LD objects from the page (handles arrays)
- `evaluateSchemaCompleteness(schemas)` - checks recommended properties for recognized schema types
- `resolveEntityName($, html)` - finds the primary brand/org name from OG tags or JSON-LD
- `measureEntityConsistency($, title, entityName)` - checks entity name presence across page surfaces

### Key Data Types

```typescript
// What flows through the pipeline:
FetchResult     -> fetcher produces this (html, status, timing)
ExtractedPage   -> extractor produces this (cleanText, $, stats)
AuditResult     -> audits produce this (7 categories, rawData)
ScoreSummary    -> scoring produces this (overallScore, grade)
Recommendation  -> recommendations produce this (priority, action text)
AnalyzerResult  -> analyzer assembles all of the above into one object
```

### Extractor (Pre-Processing)

Before audits run, the extractor does two important things:

1. **Boilerplate removal** (`support/boilerplate.ts`) - strips `<script>`, `<style>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, cookie banners, modals, ads, sidebars. This produces the "clean text" that audits run against.

2. **Stats collection** (`service.ts`) - counts everything audits need: H1/H2/H3, paragraphs, links, images, image alt text, lists, list items, tables, external links. These stats are computed once and reused across all 7 audit categories.

### Recommendations Engine

`recommendations/service.ts` iterates every factor in every category. Any factor scoring below 70% of its max gets a recommendation. Priority is based on how low the score is:

| Factor Score | Priority |
| ------------ | -------- |
| Below 30%    | `high`   |
| 30-49%       | `medium` |
| 50-69%       | `low`    |

Recommendation text comes from `recommendations/constants.ts` which maps every factor name to a specific, actionable recommendation string.

### Scoring Aggregation

`scoring/service.ts` takes all 7 category results and the weight config, then:

1. Looks up each category's weight from the config (default: all `1`)
2. Normalizes weights so they sum to 1.0
3. Computes each category's percentage: `(score / maxScore) * 100`
4. Weighted average: `sum(categoryPct * normalizedWeight)`
5. Maps the result to a letter grade via threshold lookup

---

## Sources

1. [How to Get Cited by ChatGPT: Content Traits LLMs Quote Most (Search Engine Land)](https://searchengineland.com/how-to-get-cited-by-chatgpt-the-content-traits-llms-quote-most-464868)
2. [GEO: Generative Engine Optimization (Aggarwal et al., Princeton/KDD 2024)](https://arxiv.org/abs/2311.09735)
3. [Study: AI Brand Visibility and Content Recency (Seer Interactive)](https://www.seerinteractive.com/insights/study-ai-brand-visibility-and-content-recency)
4. [How We Built a Content Optimization Tool for AI Search (Semrush)](https://www.semrush.com/blog/content-optimization-for-ai-search/)
5. [How Structured Data Helps Your Brand Get Cited in AI Results (WebFX)](https://www.webfx.com/blog/seo/structured-data-ai-citations/)
6. [2026 AI Search Visibility Benchmark Report (KnewSearch)](https://knewsearch.com/benchmark-report)
7. [AIVO Standard v2.2: Multi-Modal AI Visibility Framework (AIVO Journal)](https://aivojournal.com/standard/)
8. [The llms.txt Specification (llmstxt.org)](https://llmstxt.org/)
