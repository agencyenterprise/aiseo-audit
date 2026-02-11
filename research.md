# GEO Research & Gap Analysis

What the industry and academic research say about generative engine optimization, what actually moves the needle for AI citations, and where our audit tool has room to grow.

---

## Part 1: What The Research Says

### The Princeton GEO Paper (The Foundation)

The foundational academic work on GEO is [GEO: Generative Engine Optimization](https://arxiv.org/abs/2311.09735) by Aggarwal et al. from Princeton/IIT Delhi, presented at KDD 2024. This paper coined the term and established the field.

**Key findings from the study:**

| Optimization Method | Visibility Boost (Word Count) | Visibility Boost (Impression) |
|---------------------|-------------------------------|-------------------------------|
| Cite Sources | 30-40% | 15-30% |
| Quotation Addition | 30-40% | 15-30% |
| Statistics Addition | 30-40% | 15-30% |
| Fluency Optimization | - | 15-30% |
| Easy-to-Understand | - | 15-30% |

The most dramatic finding: **adding citations to content increased visibility by 115.1% for websites that were originally ranked 5th in traditional search**. Meanwhile, the top-ranked website's visibility actually *decreased* by 30.3% in generative responses. GEO disproportionately helps content that isn't already dominant.

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

| Crawler | Owner | Purpose |
|---------|-------|---------|
| GPTBot | OpenAI | Training + retrieval |
| ChatGPT-User | OpenAI | Live browsing requests |
| ClaudeBot | Anthropic | Training + retrieval |
| PerplexityBot | Perplexity | Real-time search index |
| Google-Extended | Google | AI training data |
| Googlebot | Google | Search + AI Overviews |

If your robots.txt blocks these user agents, you don't exist to these engines.

### The llms.txt Standard

A new proposed standard ([llmstxt.org](https://llmstxt.org/)) is emerging alongside robots.txt. The llms.txt file is a markdown document at your site's root providing AI systems with a structured overview of your content, purpose, and key resources. OpenAI, Microsoft, and others are actively crawling these files.

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
9. **Lists and Tables** - Easiest content formats for AI to extract verbatim
10. **Section Structure** - Short paragraphs (30-150 words), bold key phrases, definition patterns

### Tier 4: Authority Signals
11. **Author Attribution** - Visible bylines with credentials and schema markup
12. **Organization Identity** - Organization schema, og:site_name, About/Contact pages
13. **E-E-A-T Signals** - First-hand experience, original visuals, credentials
14. **Cross-Platform Presence** - Mentions across Reddit, LinkedIn, YouTube increase citations 2.8x

### Tier 5: Emerging
15. **llms.txt** - Markdown file at site root for AI inference optimization
16. **Content Clusters** - Pillar pages with 3-7 supporting articles, interlinked

---

## Part 3: Current Tool Coverage

| Best Practice (by tier) | Our Coverage | Category |
|------------------------|-------------|----------|
| AI Crawler Access | **Not covered** | - |
| Content Freshness | **Not covered** | - |
| Answer-First Formatting | Partially (Direct Answer Statements) | Answerability |
| Cite Sources | Covered (External References, Citation Patterns) | Grounding Signals |
| Include Statistics | Covered (Numeric Claims) | Grounding Signals |
| Add Quotations | Partially (Citation Patterns detects blockquotes) | Grounding Signals |
| Heading Hierarchy | Covered | Content Structure |
| Structured Data | Covered (JSON-LD, OG, canonical) | Authority Context |
| Lists and Tables | Covered | Content Structure |
| Section Structure | Covered (Paragraph Structure, Scannability) | Content Structure |
| Author Attribution | Covered | Authority Context |
| Organization Identity | Covered | Authority Context |
| E-E-A-T Signals | Partially (author, org, dates) | Authority Context |
| Sentence Length / Readability | Covered | Readability for Compression |
| Entity Clarity | Covered | Entity Clarity |
| llms.txt | **Not covered** | - |

---

## Part 4: Gap Analysis

Five specific gaps between the research findings and our current audit implementation, prioritized by citation impact, with integration plans for each.

---

### Gap 1: Answer Capsule Detection

**The Research:** 72.4% of blog posts cited by ChatGPT contain an "answer capsule" - a concise, self-contained explanation of 120-150 characters placed directly after a question-framed H2. Answer-first formatting (direct answer in the first 40-60 words) increased ChatGPT citations by 140%. This is the single most predictive formatting trait for AI citations.

**What We Have:** Our Answerability category checks for "Direct Answer Statements" (patterns like "The X is..." or "Simply put...") and "Q/A Patterns" (question marks and question words). But we don't check whether a concise answer actually appears immediately *after* a question-framed heading. We detect that questions exist and that answer-like sentences exist, but we don't check if they're structurally paired.

**What We Need:** A new factor in the Answerability category that:
1. Finds all H2 elements framed as questions (contains "?" or starts with what/how/why/when/where/which/who)
2. Extracts the text immediately following each question H2 (first paragraph or first sentence)
3. Checks if that text is a concise answer capsule (< 200 characters, starts with a declarative statement)
4. Scores based on the ratio of question H2s that have proper answer capsules

**Integration Plan:**

**Module:** `src/modules/audits/service.ts` - `auditAnswerability()` function
**New factor:** `Answer Capsules` (maxScore: 13, carved from redistributing existing factors)

**New pattern in `support/patterns.ts`:**
```ts
export const QUESTION_HEADING_PATTERN = /^(?:what|how|why|when|where|which|who|can|do|does|is|are|should|will)\b/i;
```

**New helper in `support/language.ts`:**
```ts
export function detectAnswerCapsules($: CheerioAPI): { total: number; withCapsule: number } {
  let total = 0;
  let withCapsule = 0;

  $('h2').each((_, el) => {
    const headingText = $(el).text().trim();
    const isQuestion = headingText.includes('?') || QUESTION_HEADING_PATTERN.test(headingText);
    if (!isQuestion) return;

    total++;
    // Get first text element after the H2
    const nextP = $(el).nextAll('p').first();
    if (!nextP.length) return;

    const firstSentence = nextP.text().trim().split(/[.!?]/)[0] || '';
    if (firstSentence.length > 0 && firstSentence.length <= 200) {
      withCapsule++;
    }
  });

  return { total, withCapsule };
}
```

**Scoring logic in `auditAnswerability()`:**
```ts
const capsules = detectAnswerCapsules(page.$);
const capsuleRatio = capsules.total > 0 ? capsules.withCapsule / capsules.total : 0;
const capsuleScore = capsules.total === 0 ? 0
  : capsuleRatio >= 0.7 ? 13
  : capsuleRatio >= 0.4 ? 9
  : capsuleRatio > 0 ? 5 : 0;

factors.push(makeFactor(
  'Answer Capsules',
  capsuleScore, 13,
  capsules.total > 0
    ? `${capsules.withCapsule}/${capsules.total} question headings have answer capsules`
    : 'No question-framed H2s found',
  capsules.total === 0 ? 'neutral' : undefined,
));
```

**Recommendation text for `constants.ts`:**
```ts
'Answer Capsules': 'Place a concise answer (under 200 characters) immediately after each question-framed H2. 72% of AI-cited content uses this "answer capsule" pattern. Put the direct answer in the first sentence, then elaborate below.',
```

**Impact:** Addresses the #1 most predictive citation trait. Research shows 140% citation increase from answer-first formatting alone.

---

### Gap 2: Content Freshness Evaluation

**The Research:** 65% of AI crawler hits target content published within the past year. Content freshness acts as a hard gate - if content is stale, nothing else matters. ChatGPT cites URLs that are 393-458 days newer than what Google ranks organically. Content lifespans have compressed from 24-36 months to 6-9 months for generative engines.

**What We Have:** Our Authority Context category detects *whether* a publication date exists via `DATE_SELECTORS` (time[datetime], itemprop=datePublished, etc). But we only check presence - we never evaluate whether the detected date is fresh or stale. A page from 2019 with a valid `datePublished` scores the same as a page updated yesterday.

**What We Need:** A new factor in Authority Context that:
1. Parses the detected date value into an actual Date object
2. Computes the age in months from today
3. Checks for a `dateModified` (not just `datePublished`) - the presence of a modified date is itself a positive signal
4. Scores based on freshness brackets: < 6 months (great), 6-12 months (good), 12-24 months (stale), > 24 months (critical)

**Integration Plan:**

**Module:** `src/modules/audits/service.ts` - `auditAuthorityContext()` function
**New factor:** `Content Freshness` (maxScore: 12)
**Adjust:** Reduce existing `Publication Date` factor from maxScore 12 to 8 (presence check only), add `Content Freshness` at maxScore 12 for evaluation

**New helper in `support/language.ts`:**
```ts
export function evaluateFreshness($: CheerioAPI): {
  publishDate: string | null;
  modifiedDate: string | null;
  ageInMonths: number | null;
  hasModifiedDate: boolean;
} {
  // Try dateModified first (stronger signal), then datePublished
  const modifiedSelectors = [
    '[itemprop="dateModified"]',
    'meta[property="article:modified_time"]',
  ];
  const publishSelectors = [
    'time[datetime]',
    '[itemprop="datePublished"]',
    'meta[property="article:published_time"]',
  ];

  let modifiedDate: string | null = null;
  let publishDate: string | null = null;

  for (const sel of modifiedSelectors) {
    const el = $(sel).first();
    if (el.length) {
      modifiedDate = el.attr('datetime') || el.attr('content') || el.text().trim();
      break;
    }
  }

  for (const sel of publishSelectors) {
    const el = $(sel).first();
    if (el.length) {
      publishDate = el.attr('datetime') || el.attr('content') || el.text().trim();
      break;
    }
  }

  const mostRecent = modifiedDate || publishDate;
  let ageInMonths: number | null = null;

  if (mostRecent) {
    const parsed = new Date(mostRecent);
    if (!isNaN(parsed.getTime())) {
      const now = new Date();
      ageInMonths = (now.getFullYear() - parsed.getFullYear()) * 12
        + (now.getMonth() - parsed.getMonth());
    }
  }

  return { publishDate, modifiedDate, ageInMonths, hasModifiedDate: !!modifiedDate };
}
```

**Scoring logic in `auditAuthorityContext()`:**
```ts
const freshness = evaluateFreshness(page.$);
let freshScore = 0;
if (freshness.ageInMonths !== null) {
  if (freshness.ageInMonths <= 6) freshScore = 12;
  else if (freshness.ageInMonths <= 12) freshScore = 9;
  else if (freshness.ageInMonths <= 24) freshScore = 5;
  else freshScore = 2;
  // Bonus: having a modified date at all is a positive signal
  if (freshness.hasModifiedDate && freshScore < 12) freshScore = Math.min(freshScore + 2, 12);
} else {
  freshScore = 0; // No parseable date = can't verify freshness
}

factors.push(makeFactor(
  'Content Freshness',
  freshScore, 12,
  freshness.ageInMonths !== null
    ? `${freshness.ageInMonths} months old${freshness.hasModifiedDate ? ', modified date present' : ''}`
    : 'No parseable date found',
));
```

**Recommendation text:**
```ts
'Content Freshness': 'Update your content to include a recent publication or modified date. 65% of AI crawler hits target content less than 1 year old. Content freshness acts as a hard gate for generative engine citations - stale content loses visibility regardless of quality.',
```

**Impact:** Addresses the research finding that freshness is a hard gate. Without this, we're ignoring the single strongest filter generative engines apply before any other signal matters.

---

### Gap 3: Section Length Analysis (Words Between Headings)

**The Research:** Pages using 120-180 words between headings receive 70% more ChatGPT citations than pages with sections under 50 words. Sections serve as the natural "chunking boundary" for generative engines - each section between headings is a potential extractable unit. Too short and there's nothing substantive to cite. Too long and it's hard for the engine to determine what the section is about.

**What We Have:** Our Content Structure category measures `Paragraph Structure` (average words per paragraph, targeting 30-150 words) and `Heading Hierarchy` (counts of H1/H2/H3). But we never measure words between consecutive headings. A page could have perfect paragraph lengths but terrible section lengths (e.g., 5 short paragraphs under one heading = good paragraph scores, but the section might be 400 words - too long for optimal extraction).

**What We Need:** A new factor in Content Structure that:
1. Walks through the DOM and collects text between consecutive heading elements
2. Counts words in each section
3. Computes the average section length
4. Scores against the 120-180 word sweet spot

**Integration Plan:**

**Module:** `src/modules/audits/service.ts` - `auditContentStructure()` function
**New factor:** `Section Length` (maxScore: 13)
**Adjust:** Redistribute existing maxScores: Heading Hierarchy 13→11, Paragraph Structure 13→11, Lists 12→11, Tables 10→8, Scannability 12→11, Section Length 13 (new). Total remains 60.

**New helper in `support/language.ts`:**
```ts
export function measureSectionLengths($: CheerioAPI): {
  sectionCount: number;
  avgWordsPerSection: number;
  sections: number[]; // word counts per section
} {
  const headings = $('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) return { sectionCount: 0, avgWordsPerSection: 0, sections: [] };

  const sections: number[] = [];

  headings.each((i, el) => {
    let words = 0;
    let sibling = $(el).next();

    while (sibling.length && !sibling.is('h1, h2, h3, h4, h5, h6')) {
      const text = sibling.text().trim();
      words += text.split(/\s+/).filter(w => w.length > 0).length;
      sibling = sibling.next();
    }

    if (words > 0) sections.push(words);
  });

  const avg = sections.length > 0
    ? Math.round(sections.reduce((a, b) => a + b, 0) / sections.length)
    : 0;

  return { sectionCount: sections.length, avgWordsPerSection: avg, sections };
}
```

**Scoring logic in `auditContentStructure()`:**
```ts
const sectionData = measureSectionLengths(page.$);
let sectionScore = 0;
if (sectionData.sectionCount === 0) {
  sectionScore = 0;
} else if (sectionData.avgWordsPerSection >= 120 && sectionData.avgWordsPerSection <= 180) {
  sectionScore = 13; // Sweet spot
} else if (sectionData.avgWordsPerSection >= 80 && sectionData.avgWordsPerSection <= 250) {
  sectionScore = 9; // Acceptable range
} else if (sectionData.avgWordsPerSection > 0) {
  sectionScore = 4; // Too short or too long
}

factors.push(makeFactor(
  'Section Length',
  sectionScore, 13,
  sectionData.sectionCount > 0
    ? `${sectionData.sectionCount} sections, avg ${sectionData.avgWordsPerSection} words`
    : 'No headed sections found',
  sectionData.sectionCount === 0 ? 'neutral' : undefined,
));
```

**Recommendation text:**
```ts
'Section Length': 'Aim for 120-180 words between headings. Pages with this section length receive 70% more AI citations. Each headed section should be a complete, self-contained unit of information that a generative engine could extract and reuse.',
```

**Impact:** Directly addresses the 70% citation increase finding. This is a structural signal we completely miss today, and it's distinct from paragraph length.

---

### Gap 4: Quotation-with-Attribution Detection

**The Research:** The Princeton GEO paper found that quotation addition increased visibility by 30-40%. Quotation-with-attribution is especially effective for People & Society, History, and Explanation content domains. The key is not just having quoted text, but having quotes explicitly attributed to a named source: `"quoted text" - Expert Name` or `"quoted text," said [Person]`.

**What We Have:** Our Grounding Signals category has two relevant factors:
- `Citation Patterns` - detects `[1]`, `(Author, 2024)`, "according to", "research shows", plus counts `<blockquote>`, `<cite>`, and `<q>` elements
- `Attribution Indicators` - detects "according to", "said", "stated", "reported", "cited by"

The gap: we detect blockquotes as a count in Citation Patterns, and we detect attribution verbs separately, but we never check if quotes have proper attribution attached. A page full of `<blockquote>` elements with no attribution scores well on both factors, but the research says the *combination* (quote + named source) is what drives citation.

**What We Need:** A new factor in Grounding Signals that specifically detects the quote-with-attribution pattern:
1. Check for `<blockquote>` elements that include a `<cite>` child or a `<footer>` with attribution
2. Check for inline patterns like `"quoted text," said [Name]` or `"quoted text" - [Name]`
3. Check for "According to [Name], 'quoted text'" patterns

**Integration Plan:**

**Module:** `src/modules/audits/service.ts` - `auditGroundingSignals()` function
**New factor:** `Quoted Attribution` (maxScore: 10)
**Adjust:** Redistribute: External References 15→13, Citation Patterns 15→13, Numeric Claims 15→13, Attribution Indicators 15→11, Quoted Attribution 10 (new). Total remains 60.

**New patterns in `support/patterns.ts`:**
```ts
export const QUOTED_ATTRIBUTION_PATTERNS = [
  /"[^"]{10,}"\s*[-\u2013\u2014]\s*[A-Z][a-z]+/g,        // "quote" - Name
  /"[^"]{10,}",?\s+said\s+[A-Z]/g,                         // "quote," said Name
  /"[^"]{10,}",?\s+according\s+to\s+[A-Z]/g,               // "quote," according to Name
  /according\s+to\s+[A-Z][a-z]+[^,]*,\s*"[^"]{10,}"/g,    // According to Name, "quote"
];
```

**Scoring logic in `auditGroundingSignals()`:**
```ts
// Quoted attribution (new)
const quotedAttrPatterns = countPatternMatches(text, QUOTED_ATTRIBUTION_PATTERNS);
const blockquotesWithCite = $('blockquote').filter((_, el) =>
  $(el).find('cite, footer, figcaption').length > 0
).length;
const totalQuotedAttr = quotedAttrPatterns + blockquotesWithCite;

const quotedAttrScore = thresholdScore(totalQuotedAttr, [
  [4, 10], [2, 7], [1, 4], [0, 0],
]);
factors.push(makeFactor(
  'Quoted Attribution',
  quotedAttrScore, 10,
  `${totalQuotedAttr} attributed quotes`,
  totalQuotedAttr === 0 ? 'neutral' : undefined,
));
```

**Recommendation text:**
```ts
'Quoted Attribution': 'Add expert quotes with clear attribution. Use patterns like "Quote text" - Expert Name or "Quote text," said Expert Name. The Princeton GEO study found quotation addition increased generative visibility by 30-40%.',
```

**Impact:** Separates the high-value quote+attribution signal from generic citation detection. The Princeton paper ranked this alongside statistics and citations as the top visibility methods.

---

### Gap 5: AI Discoverability Signals (robots.txt + llms.txt)

**The Research:** If your robots.txt blocks GPTBot, ClaudeBot, PerplexityBot, or Google-Extended, your content doesn't exist to generative engines. This is the most fundamental GEO requirement - a binary gate before anything else can matter. Additionally, the emerging llms.txt standard provides AI systems with a structured overview of your site, and major providers are actively crawling for it.

**What We Have:** Nothing. We don't check robots.txt or llms.txt. Our fetcher module downloads the target URL, but we never look at the domain's root-level signals. A site could score 95/100 on our audit while actively blocking every AI crawler from accessing its content.

**What We Need:** A new audit category or new factors within Content Extractability that:
1. Fetch the domain's `/robots.txt` and check if major AI crawlers are allowed or blocked
2. Check for the existence of `/llms.txt` and `/llms-full.txt` at the domain root
3. Score based on access: all crawlers allowed = full score, some blocked = partial, all blocked = critical

**Integration Plan:**

**Module:** `src/modules/audits/service.ts` - `auditContentExtractability()` function
**New factors:** `AI Crawler Access` (maxScore: 10), `LLMs.txt Presence` (maxScore: 5)
**Adjust:** Reduce existing factors: Fetch Success 15→12, Text Extraction Quality 15→12, Boilerplate Ratio 15→12, Word Count Adequacy 15→12, AI Crawler Access 10 (new), LLMs.txt Presence 5 (new). Total category stays at ~60 range.

**This gap requires a fetcher change.** The audit function currently receives `(page, fetchResult)` but has no way to fetch additional URLs. Two options:

**Option A (Simpler - Pre-fetch in analyzer):** Modify the analyzer orchestrator to fetch robots.txt and llms.txt alongside the main page, then pass the results into the audit.

**Option B (Self-contained):** Add a light utility that does synchronous-style checks within the audit.

Recommended: **Option A** - modify the analyzer.

**Changes to `src/modules/analyzer/service.ts`:**
```ts
// After the main page fetch, also fetch domain signals
const domain = getDomain(fetchResult.finalUrl || options.url);
const robotsUrl = `https://${domain}/robots.txt`;
const llmsTxtUrl = `https://${domain}/llms.txt`;

// Fire both in parallel, non-blocking (don't fail the audit if these fail)
const [robotsResult, llmsResult] = await Promise.allSettled([
  fetchPage({ url: robotsUrl, timeout: 5000, userAgent: config.userAgent }),
  fetchPage({ url: llmsTxtUrl, timeout: 5000, userAgent: config.userAgent }),
]);

const domainSignals = {
  robotsTxt: robotsResult.status === 'fulfilled' ? robotsResult.value.html : null,
  llmsTxtExists: llmsResult.status === 'fulfilled' && llmsResult.value.statusCode === 200,
};
```

**Changes to audit function signature:**
```ts
// Update runAudits to accept optional domain signals
export function runAudits(
  page: ExtractedPage,
  fetchResult: FetchResult,
  domainSignals?: { robotsTxt: string | null; llmsTxtExists: boolean }
): AuditResult
```

**New helper in `support/language.ts` (or a new `support/robots.ts`):**
```ts
const AI_CRAWLERS = ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'];

export function checkCrawlerAccess(robotsTxt: string | null): {
  allowed: string[];
  blocked: string[];
  unknown: string[];
} {
  if (!robotsTxt) return { allowed: [], blocked: [], unknown: AI_CRAWLERS };

  const lines = robotsTxt.split('\n').map(l => l.trim().toLowerCase());
  const allowed: string[] = [];
  const blocked: string[] = [];
  const unknown: string[] = [];

  for (const crawler of AI_CRAWLERS) {
    const crawlerLower = crawler.toLowerCase();
    // Find user-agent block for this crawler
    let inBlock = false;
    let isBlocked = false;
    let found = false;

    for (const line of lines) {
      if (line.startsWith('user-agent:')) {
        const ua = line.split(':')[1]?.trim();
        inBlock = ua === crawlerLower || ua === '*';
      } else if (inBlock && line.startsWith('disallow:')) {
        const path = line.split(':')[1]?.trim();
        if (path === '/') { isBlocked = true; found = true; }
      } else if (inBlock && line.startsWith('allow:')) {
        found = true;
      }
    }

    if (!found) unknown.push(crawler);
    else if (isBlocked) blocked.push(crawler);
    else allowed.push(crawler);
  }

  return { allowed, blocked, unknown };
}
```

**Scoring logic in `auditContentExtractability()`:**
```ts
// AI Crawler Access
if (domainSignals) {
  const access = checkCrawlerAccess(domainSignals.robotsTxt);
  const blockedCount = access.blocked.length;
  const crawlerScore = blockedCount === 0 ? 10
    : blockedCount <= 2 ? 6
    : blockedCount <= 4 ? 3
    : 0;
  factors.push(makeFactor(
    'AI Crawler Access',
    crawlerScore, 10,
    blockedCount === 0
      ? 'All major AI crawlers allowed'
      : `${access.blocked.join(', ')} blocked`,
  ));

  // llms.txt Presence
  factors.push(makeFactor(
    'LLMs.txt Presence',
    domainSignals.llmsTxtExists ? 5 : 0, 5,
    domainSignals.llmsTxtExists ? 'Found at domain root' : 'Not found',
    domainSignals.llmsTxtExists ? undefined : 'neutral',
  ));
}
```

**Recommendation texts:**
```ts
'AI Crawler Access': 'Your robots.txt is blocking AI crawlers. Ensure GPTBot, ClaudeBot, PerplexityBot, and Google-Extended are allowed. Blocking these crawlers means your content cannot be discovered or cited by generative engines.',
'LLMs.txt Presence': 'Consider adding an llms.txt file at your domain root. This emerging standard provides AI systems with a structured overview of your site, helping them understand and reference your content more effectively.',
```

**Impact:** Addresses the most fundamental GEO requirement. Without crawler access, every other optimization is meaningless. The llms.txt check is low-cost and forward-looking.

---

## Summary: Priority Ranking

| # | Gap | Category | Impact | Effort |
|---|-----|----------|--------|--------|
| 1 | Answer Capsule Detection | Answerability | High (140% citation increase) | Low |
| 2 | Content Freshness Evaluation | Authority Context | High (hard gate, 65% of hits) | Low |
| 3 | Section Length Analysis | Content Structure | High (70% more citations) | Low |
| 4 | Quoted Attribution Detection | Grounding Signals | Medium (30-40% visibility) | Low |
| 5 | AI Discoverability (robots.txt + llms.txt) | Content Extractability | High (binary gate) | Medium |

Gaps 1-4 are purely additive - new factors added to existing categories with no architectural changes. Gap 5 requires a minor change to the analyzer orchestrator to pre-fetch domain-level signals, but the audit logic itself is straightforward.

All five gaps can be implemented without creating any new modules or categories. They integrate cleanly into the existing 7-category structure by adding new factors and redistributing maxScore budgets within each affected category.

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
