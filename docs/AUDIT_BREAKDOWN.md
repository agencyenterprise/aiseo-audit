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

If the fetch fails entirely (before an HTTP status is returned), the HTTP layer throws a typed `FetchError` with a `code` field indicating the cause: `TIMEOUT`, `DNS_FAILURE`, `CONNECTION_REFUSED`, `TLS_ERROR`, `TOO_LARGE`, or `NETWORK_ERROR`. Each includes a human-readable message with the hostname and actionable guidance. The CLI surfaces these directly instead of the generic "fetch failed".

**Text Extraction Quality** measures the ratio `cleanTextLength / rawByteLength`:

Bands are contiguous (each band's upper bound is exclusive), so a continuous ratio can never fall between them:

- 5% to <16% = 12 (ideal for a normal web page)
- 16% and above = 10 (text-heavy, fine but less structured)
- 1% to <5% = 8
- Below 1% but some content = 2 (mostly binary or non-text content)
- No extractable content = 0

**Boilerplate Ratio** is computed by removing entire DOM elements (including all nested children) that match the boilerplate selectors, then comparing the cleaned text length to the raw text length. The full removal list:

- HTML elements: `<script>`, `<style>`, `<noscript>`, `<svg>`, `<iframe>`, `<nav>`, `<header>`, `<footer>`, `<aside>`
- ARIA roles: `[role="navigation"]`, `[role="banner"]`, `[role="contentinfo"]`
- Class/ID selectors: `.sidebar`, `#sidebar`, `.nav`, `.navbar`, `.footer`, `.header`, `.menu`, `.ad`, `.ads`, `.advertisement`, `.cookie-banner`, `#cookie-consent`, `.cookie-notice`
- Cookie/consent/overlay class names, matched at the whole-class-token level: an element is removed only when a class token consists entirely of boilerplate words (`cookie`, `cookies`, `consent`, `gdpr`, `popup`, `modal`, `overlay`) plus generic UI qualifiers (`banner`, `notice`, `backdrop`, `wrapper`, ...). `cookie-consent-banner` is removed; `cookie-recipe-card` is content and kept.

Scoring:

- Less than 30% boilerplate = 12
- 30-50% = 9
- 50-70% = 6
- Over 70% = 2

**Word Count Adequacy**:

- 300-3000 words = 12 (ideal range for generative reuse)
- 100-299 = 8
- Over 3000 = 10 (lengthy but still usable)
- 1-99 = 2 (too thin to be useful)
- 0 words = 0

**AI Crawler Access** fetches `robots.txt` from the origin of the URL being audited (where the file lives per RFC 9309; auditing `https://example.com/projects/page` checks `https://example.com/robots.txt`). Use `--signals-base` to override the base URL when your domain signals live elsewhere. Every report explicitly shows which URL domain signals were fetched from. For sitemap audits, domain signals are fetched once from the sitemap origin and shared across all URLs in the audit.

The crawlers checked, using the user-agent tokens each vendor documents:

- GPTBot, OAI-SearchBot, ChatGPT-User (OpenAI)
- ClaudeBot, Claude-User, Claude-SearchBot (Anthropic)
- PerplexityBot, Perplexity-User (Perplexity)
- Google-Extended (Google AI training)
- Applebot-Extended (Apple AI training)
- CCBot (Common Crawl), Bytespider (ByteDance), meta-externalagent (Meta)

The parser applies proper robots.txt rule evaluation: `*` wildcards and `$` end anchors in paths (`Disallow: /*` blocks everything, same as `Disallow: /`), longest-path-wins specificity, `Allow` overrides `Disallow` at equal path length, blank lines inside groups tolerated, and both crawler-specific groups and `*` wildcard groups respected. A crawler is site-blocked only when a disallow rule matching `/` applies without an overriding `Allow`. Path-level partial blocks (e.g. `Disallow: /blog/`) are surfaced separately in the audit output as `partiallyBlocked`. These do not count as a full site block but are visible for review.

Scoring: 0 blocked = 10, 1-2 blocked = 6, 3-4 blocked = 3, 5+ blocked = 0

**LLMs.txt Presence** checks for an emerging standard [[8]](#sources) that is gaining traction alongside robots.txt. Unlike robots.txt (which controls access), llms.txt is a curated roadmap that helps AI systems understand your site's content, purpose, and key resources at inference time. OpenAI, Microsoft, and other major providers are actively crawling for these files. No major LLM has confirmed it as a ranking signal yet, but adoption is low-cost and forward-looking.

Two files are checked relative to the signals base URL (same behavior as `robots.txt` above):

- `llms.txt` - a markdown document providing AI systems with a structured overview of the site's content and key pages
- `llms-full.txt` - a comprehensive version with full content for deeper ingestion

Scoring: both found = 6, one found = 4, neither = 0 (scored as `neutral`)

**Image Accessibility** checks whether images have meaningful alt text and use semantic markup. Multimodal AI models (Gemini 2.5, GPT-4o) directly ingest images and rely on structured metadata for grounding. The AIVO Standard v2.2 establishes image readiness as a first-class AI visibility signal [[7]](#sources).

Two sub-checks:

1. Alt text coverage: what ratio of `<img>` elements have **meaningful** alt text? An alt value counts as meaningful when it is non-empty, under 200 characters, and not a generic placeholder (`"image"`, `"photo"`, `"logo"`, `"icon"`, `"picture"`, `"img"`, `"graphic"`, `"thumbnail"`). A specific single word like a brand or product name counts.
2. Semantic captions: are any images wrapped in `<figure>` with a `<figcaption>` child?

Scoring:

- 90%+ images have meaningful alt text = +5, 50-89% = +3, under 50% = +1
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
- Over 200 = 2
- No paragraphs = 0

**Scannability** is a composite of three sub-checks:

- Bold text (`<strong>` or `<b>`) present = +4
- At most 150 words per visual break (headings, lists, tables, and images all count as breaks) = +4
- Heading-to-paragraph ratio >= 0.1 = +3

Paragraph length itself is scored by the separate Paragraph Structure factor; scannability measures how often ANY visual anchor interrupts the text.

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

- Sentences starting with `The [word] is...` (start of text or after end punctuation)
- Sentences starting with `It is...`, `This is...`, `They are...`
- Phrases: `simply put`, `in short`

Detection is sentence-boundary based because the analyzed text is whitespace-normalized; line anchors would never match.

Scoring: 5+ = 11, 2-4 = 8, 1 = 4, none = 0

**Answer Capsules** detects the "answer capsule" pattern: 72% of AI-cited content has a concise answer (under 200 characters) placed immediately after a question-framed H2 [[1]](#sources). The check:

1. Finds all H2 elements framed as questions (contains `?` or starts with what/how/why/when/where/which/who/can/do/does/is/are/should/will)
2. Finds the answering paragraph: the first `<p>` among the heading's following siblings (looking inside wrapper `<div>`s, stopping at the next heading)
3. Checks if the first sentence of that paragraph is <= 200 characters (a concise answer capsule)
4. Scores based on the ratio of question H2s with proper capsules

Scoring: 70%+ have capsules = 13, 40-69% = 9, some = 5, question H2s but no capsules = 2, no question H2s = 0 (scored as `neutral`)

**Step-by-Step Content** combines two detection methods:

Pattern matching scans for:

- `step 1`, `step 2`, etc.
- Literal numbered sequences like `1. Install the package 2. Configure ...` anywhere in the text
- `firstly`, `secondly`, `finally`
- `how to`
- Presence of `<ol>` elements (adds +2 to count)

NLP-based detection (via `compromise`) additionally counts imperative verbs: instruction-mode verbs like "install", "configure", "click", "open", "run". These are semantically step-like even when not numbered, and are missed by pattern matching alone.

Both counts are summed. Scoring: 5+ = 10, 2-4 = 7, 1 = 3, none = 0

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

This category uses a hybrid NLP approach for entity extraction: [compromise](https://github.com/spencermountain/compromise) for base NER (people, organizations, places), supplemented by pattern-based extractors for acronym entities, title-case compound names, and organization/person classification via suffix and honorific matching. A name recognized as a person or place is never double-counted as an organization. Topics are extracted by frequency analysis over noun terms (adjacent-word bigrams boosted, capped at 15 terms) and are reported separately from named entities. All entity lists are deduplicated case-insensitively with whole-word subphrase containment ("Smith" inside "John Smith" is subsumed; "ART" inside "Martha Stewart" is not). No external APIs.

### Factors

| Factor            | Max | What It Measures                                             |
| ----------------- | --- | ------------------------------------------------------------ |
| Entity Richness   | 20  | Total unique NAMED entities extracted (people, orgs, places) |
| Topic Consistency | 25  | Do extracted topics align with the page title and H1?        |
| Entity Density    | 15  | Entities per 100 words (sweet spot: 2-8)                     |

### Scoring Details

**Entity Richness** counts unique named entities (people, organizations, places; frequency-derived topics are excluded so long articles cannot max this factor on word counts alone):

- 9+ entities = 20
- 4-8 = 14
- 1-3 = 7
- None = 0 (scored as `neutral`)

**Topic Consistency** extracts keywords from the page `<title>` and `<h1>` (words > 3 characters), then checks how many of those keywords appear among the extracted topics or are repeated frequently (3+ whole-word occurrences) in the body text:

- 50%+ of title/H1 keywords found in topics = 25
- Some overlap = 15
- No overlap = 5

**Entity Density** is `(namedEntities / wordCount) * 100`, with contiguous bands:

- 2 to <8 per 100 words = 15 (ideal)
- 1 to <2, or 8 and above = 10
- Below 1 but some entities = 3
- No entities = 0

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

1. Text pattern matches: `[1]`, author-year citations like `(Smith, 2024)` (a capitalized author and a comma are required, so `(founded in 1999)` does not count), `research shows`, `studies indicate`, `data from`, `as reported by`. `according to` is counted by the Attribution Indicators factor instead, so one phrase never feeds two factors.
2. HTML elements: `<blockquote>`, `<q>`, and standalone `<cite>` (a `<cite>` inside a `<blockquote>` counts once, not twice)

Sum scored: 6+ = 13, 3-5 = 9, 1-2 = 5, none = 0

**Numeric Claims** combines two detection methods:

Pattern matching scans for:

- Percentages: `42%`
- Large numbers: `3 million`, `2 billion`
- Currency: `$1,200`
- Change indicators: `increased by`, `decreased by`, `grew by`

NLP-based detection (via `compromise`) additionally counts written-out numbers like "five studies" or "three companies" that regex cannot reliably capture. Digit forms are counted only by the regexes, so `42%` is one signal, never two.

Both counts are summed. Scoring: 9+ = 13, 4-8 = 9, 1-3 = 5, none = 0

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

- An `Organization` object in parsed JSON-LD (including inside `@graph` envelopes and `@type` arrays, as emitted by Yoast and most WordPress SEO plugins)
- `<meta property="og:site_name">` with content

Either found = 10, neither = 0

**Contact/About Links** checks for `<a>` elements whose URL path contains `about`, `team`, `company`, or `contact` as a path segment (or whose link text is that word), plus `mailto:` links for contact. Plain substring matching would count `/blog/all-about-widgets` as an About page, so it is not used:

- Both about-type AND contact found = 10
- One of the two = 5
- Neither = 0

**Publication Date** checks these publish-date selectors in order (presence only; modified dates are evaluated by the separate Content Freshness factor):

- `<time datetime>`, `[itemprop="datePublished"]`
- `.published`, `.post-date`, `.entry-date`
- `meta[property="article:published_time"]`

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

For each recognized schema, the check computes what percentage of recommended properties are present, then averages across all schemas on the page. Multi-typed objects (`"@type": ["BlogPosting", "Article"]`) are graded against their first recognized type, and `@graph` envelopes are flattened before evaluation.

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

FRE is a continuous value, so the bands are contiguous with exclusive upper bounds:

- FRE 60 to <71 = 15 (ideal for broad audiences)
- FRE 71 and above = 13 (very easy, good)
- FRE 50 to <60 = 10
- FRE 30 to <50 = 6
- FRE below 30 = 0 (very difficult to read)

Syllable counting uses a heuristic: count vowel groups, adjust for silent-e and common suffixes.

**Jargon Density** is the ratio of complex words (4+ syllables) to total words:

- Under 2% = 15 (very accessible)
- 2-5% = 12
- 5-10% = 8
- Over 10% = 0

**Transition Usage** counts how many distinct transition words from a list of 20 appear in the text (whole-word matches, so "dissimilarly" does not count as "similarly"):

- `however`, `therefore`, `moreover`, `furthermore`, `consequently`, `additionally`, `in contrast`, `similarly`, `as a result`, `for example`, `for instance`, `on the other hand`, `nevertheless`, `meanwhile`, `likewise`, `in addition`, `specifically`, `in particular`, `notably`, `importantly`

Scoring: 10+ types = 15, 5-9 = 11, 2-4 = 7, 1 = 3, none = 0

### Why This Matters

Generative engines don't quote your content verbatim - they compress, summarize, and rephrase it. Content that uses clear sentence structure, accessible vocabulary, and logical transitions compresses cleanly. Dense academic prose with 40-word sentences and heavy jargon is harder for engines to distill into useful answers without losing meaning.

---

## Grading Scale

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

## Code Architecture

### Pipeline

When you run `aiseo-audit https://example.com`, here's exactly what happens:

```
cli.ts -> cli/program.ts        parses args with commander, owns exit codes
  |
  v
config/service.ts               loads aiseo.config.json (if present), merges defaults via Zod
  |
  v
analyzer/service.ts             orchestrates the full pipeline:
  |
  +---> fetcher/service.ts      fetch GET -> raw HTML, status code, timing
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
report/service.ts               renders output (pretty, json, md, or html)
  |
  v
stdout                          (or --out file)

For sitemap audits, the pipeline diverges at the top:

cli.ts (--sitemap flag)
  |
  v
sitemap/service.ts              fetches + parses sitemap XML, runs analyzer pipeline
  |                             once per URL with shared domain signals, aggregates results
  +---> fetchDomainSignals()    called once for the sitemap URL (or --signals-base override)
  |
  +---> analyzeUrlWithSignals() called per URL with the shared domain signals
  |
  v
report/service.ts               renders sitemap summary + per-URL results
```

### Module Pattern

Every module follows the same structure:

```
module/
  schema.ts       Contract types; Zod schemas where data is actually parsed
  service.ts      Pure business logic (throws on failure)
  constants.ts    Thresholds, config defaults, display names
  support/        Private helpers only used inside this module
```

**Schemas** define the contract. Zod schemas exist where data crosses a trust boundary and is parsed at runtime (config files, fetch options, baseline audit JSON); purely internal shapes are plain TypeScript types so a reader can tell at a glance which validation is load-bearing.

**Services** contain the actual logic. They take validated inputs, do work, and return typed results. They throw on failure (the HTTP layer throws typed `FetchError` instances with a `code` field for classified network errors). Error handling lives in the CLI entry point (`cli/program.ts`), which maps outcomes to the documented exit codes: 0 success, 1 below `--fail-under`, 2 usage or runtime error.

### Audits Module in Detail

The audits module is the largest and most important module. Here's how it's organized:

```
audits/
  schema.ts              CategoryResult, FactorResult, AuditResult, AuditRawData types
  service.ts             runAudits() orchestrator - imports and calls all 7 category audits
  constants.ts           CATEGORY_DISPLAY_NAMES
  category.ts            buildCategoryOutput() - shared category assembly
  factor-names.ts        Canonical registry of all factor display names

Each audit category is its own top-level module with the pattern:
  <category>/index.ts    audit<Category>() entry point
  <category>/*.ts        category-specific helpers (regex lists, selectors,
                         parsers such as answerability/capsules.ts,
                         authority-context/json-ld.ts, content-extractability/robots.ts)

nlp/
  schema.ts              ExtractedEntitiesSchema and ExtractedEntitiesType
  constants.ts           STOPWORDS, ACRONYM_STOPLIST, ORG_SUFFIXES, PERSON_HONORIFICS
  service.ts             extractEntities() + re-exports from support/
  support/
    entities.ts          Acronym/title-case extractors, dedup, merge, classification
    readability.ts       computeFleschReadingEase, countComplexWords, avgSentenceLength
    topics.ts            extractTopics (frequency-based topic terms, capped at 15)
    patterns.ts          countPatternMatches

sitemap/
  schema.ts              SitemapOptions, SitemapResult, SitemapUrlResult types
  service.ts             analyzeSitemap() - fetches sitemap XML via xml-to-html-converter,
                         recurses into sitemap indexes (cycle-safe, depth-capped),
                         deduplicates URLs, records non-fatal problems as warnings,
                         runs analyzer pipeline per URL with shared domain signals

report/support/
  view-model.ts          Presentation decisions shared by all four renderers
                         (percentages, quality bands, priority labels, grouping,
                         HTML/markdown escaping)
```

**`service.ts`** exports a single function `runAudits(page, fetchResult, domainSignals?)` that imports and calls the 7 category audit functions. It extracts entities once via `extractEntities(page.cleanText)` and passes the result to the three audits that need it, avoiding redundant NLP processing. Each audit returns a `CategoryAuditOutput` containing both its category result and its typed raw diagnostic data:

```
auditContentExtractability(page, fetchResult, domainSignals)
auditContentStructure(page)
auditAnswerability(page, entities?)
auditEntityClarity(page, entities?)
auditGroundingSignals(page, entities?)
auditAuthorityContext(page)
auditReadabilityForCompression(page)
```

The `entities?` parameter is optional for backward compatibility. When omitted, each audit extracts entities itself. `runAudits` is the single merge point - it sets the base `rawData` fields (`title`, `metaDescription`, `wordCount`) from the page, then spreads each audit function's partial raw data together into a typed `AuditRawDataType`. No audit function mutates external state.

The `domainSignals` parameter is a `DomainSignalsType` object containing: `signalsBase` (the URL domain signals were fetched from), `robotsTxt` (raw content or null), `llmsTxtExists`, and `llmsFullTxtExists`. It is fetched by the analyzer orchestrator before audits run. For sitemap audits it is fetched once and passed to every per-URL audit.

Each audit function follows the same pattern:

1. Create an empty `factors[]` array
2. Run each check, push a `FactorResult` via `makeFactor(name, score, maxScore, value)`
3. Return via `buildCategoryOutput(key, factors, rawData)` (audits/category.ts), which assembles the display name, key, and score totals identically for every category

Factor display names live in **`audits/factor-names.ts`**. `makeFactor` only accepts registered names, and `RECOMMENDATION_BUILDERS` must cover exactly that set, so renaming or adding a factor is a compile error everywhere it matters. Detection regexes live next to the category that uses them (e.g. `answerability/patterns.ts`, `grounding-signals/patterns.ts`).

**`scoring/service.ts`** provides all scoring utilities in one place:

- `thresholdScore(value, brackets, type?)` - maps a numeric value to a score using threshold brackets. Supports three modes via the `type` parameter: `"higher"` (default, the score of the highest threshold the value meets), `"lower"` (mirror image, for metrics where lower is better like jargon ratio), and `"range"` (contiguous [min, max) bands, min inclusive and max exclusive, for sweet-spot metrics like sentence length; contiguity guarantees a continuous value can never fall into a gap between bands)
- `makeFactor(name, score, max, value)` - builds a `FactorResult` and auto-assigns status (`good` >= 70%, `needs_improvement` >= 30%, `critical` < 30%)
- `sumFactors(factors)` / `maxFactors(factors)` - add up scores/maxScores
- `computeScore(categories, weights)` - weighted average of category percentages
- `computeGrade(score)` - maps 0-100 score to letter grade

**`nlp/service.ts`** is the dedicated NLP module:

- `extractEntities(text)` - hybrid entity extraction: compromise for base NER (people, orgs, places), supplemental pattern-based extractors for acronyms and title-case compounds, frequency-based topics (capped at 15), with word-bounded deduplication and cross-list person/org disambiguation
- `computeFleschReadingEase(text)` - standard Flesch formula using heuristic syllable counting
- `countComplexWords(text)` - words with 4+ syllables
- `countPatternMatches(text, patterns)` - runs an array of regex patterns against text, sums all match counts

(`countTransitionWords` lives with its word list in `readability/transition-words.ts`.)

Category-specific helpers live inside their category module:

- `answerability/capsules.ts` - finds question-framed H2s and checks for concise answer paragraphs
- `authority-context/freshness.ts` - parses dateModified/datePublished and calculates content age in months
- `content-structure/sections.ts` - walks DOM to count words between consecutive headings
- `content-extractability/robots.ts` - parses robots.txt (wildcards, `$` anchors) for AI crawler allow/block status
- `authority-context/json-ld.ts` - extracts all JSON-LD objects (flattens arrays and `@graph`, normalizes `@type` arrays)
- `authority-context/schema-analysis.ts` - checks recommended properties for recognized schema types
- `authority-context/entity.ts` - finds the primary brand/org name and checks its presence across page surfaces

### Key Data Types

```typescript
// What flows through the pipeline:
FetchResult     -> fetcher produces this (html, status, timing)
ExtractedPage   -> extractor produces this (cleanText, $, stats)
AuditResult     -> audits produce this (7 categories, rawData)
ScoreSummary    -> scoring produces this (overallScore, grade)
Recommendation  -> recommendations produce this (priority, text, optional steps/codeExample/learnMoreUrl)
AnalyzerResult  -> analyzer assembles all of the above into one object
```

### Extractor (Pre-Processing)

Before audits run, the extractor does two important things:

1. **Boilerplate removal** (`support/boilerplate.ts`) - strips `<script>`, `<style>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, cookie banners, modals, ads, sidebars. This produces the "clean text" that audits run against.

2. **Stats collection** (`service.ts`) - counts everything audits need: H1/H2/H3, paragraphs, links, images, image alt text, lists, list items, tables, external links. These stats are computed once and reused across all 7 audit categories.

### Recommendations Engine

`recommendations/service.ts` iterates every factor in every category. Any factor scoring below 70% of its max gets a recommendation, except factors marked `neutral` (not applicable to the page, e.g. Tables Presence on a page with no tabular data), which are never recommended. Priority is based on how low the score is:

| Factor Score | Priority |
| ------------ | -------- |
| Below 30%    | `high`   |
| 30-49%       | `medium` |
| 50-69%       | `low`    |

Recommendation content comes from two files in `recommendations/`:

- `constants.ts` maps every factor name to a builder function. Most builders are dynamic: they receive `rawData` and personalize the output (e.g. using the detected organization name, first detected topic, or existing external links).
- `examples.ts` holds static HTML code examples referenced by those builders. Separating them keeps builder logic readable and makes the examples easy to find and edit independently.

Builder functions return a `RecommendationOutput`:

```typescript
interface RecommendationOutput {
  text: string; // summary recommendation (always present)
  steps?: string[]; // ordered implementation steps
  codeExample?: string; // ready-to-use code snippet
  learnMoreUrl?: string; // link to canonical spec or guide
}
```

Every factor that falls below the 70% threshold now generates fully actionable output with implementation steps and a ready-to-use code example:

| Factor                   | What It Generates                                                      |
| ------------------------ | ---------------------------------------------------------------------- |
| Structured Data          | Article or FAQPage JSON-LD from page title/description/questions       |
| Schema Completeness      | Exact missing properties with placeholder values                       |
| Answer Capsules          | Before/after heading-to-answer-capsule HTML transformation             |
| AI Crawler Access        | robots.txt `Allow` rules for each blocked crawler                      |
| LLMs.txt Presence        | Starter `llms.txt` or `llms-full.txt` content                          |
| Author Attribution       | Byline HTML + JSON-LD author block using detected entities             |
| Heading Hierarchy        | Recommended H1/H2/H3 structure from the page title                     |
| Content Freshness        | `dateModified` markup for both HTML and JSON-LD                        |
| Image Accessibility      | `alt` text patterns and `<figure>`/`<figcaption>` example              |
| Lists Presence           | Before/after converting prose enumerations to `<ul>` and `<ol>`        |
| Tables Presence          | Full `<table>` with `<caption>`, `<thead>`, and `<tbody>`              |
| Definition Patterns      | Inline definition and `<dl>` example                                   |
| Direct Answer Statements | Before/after moving the answer to the first sentence                   |
| Summary/Conclusion       | `<h2>Key Takeaways</h2>` with bullet structure                         |
| Attribution Indicators   | Before/after adding "According to [Source]" with a link                |
| Citation Patterns        | In-text `[1]` markers, `<cite>` tags, and a References section         |
| Quoted Attribution       | `<blockquote>` with `<footer>` and `<cite>` attribution                |
| Transition Usage         | Before/after paragraph with contrast and conclusion transitions        |
| Jargon Density           | Before/after defining a technical term on first use                    |
| Organization Identity    | `og:site_name` meta tag + Organization JSON-LD using detected org name |
| Publication Date         | `<time datetime>` element + JSON-LD `datePublished`                    |
| Contact/About Links      | `<nav>` with About and Contact anchors                                 |
| External References      | Linked citation example with anchor text guidance                      |
| Entity Richness          | Steps for naming and linking key entities                              |

The optional fields are absent (not `null`) when not populated, so existing JSON consumers are unaffected.

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
