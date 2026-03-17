import type { AuditRawDataType } from "../audits/schema.js";
import {
  answerCapsuleExample,
  attributionIndicatorExample,
  blockquoteAttributionExample,
  citationMarkupExample,
  contactLinksExample,
  directAnswerExample,
  imageAltTextExample,
  jargonReductionExample,
  listsConversionExample,
  summaryStructureExample,
  tablesMarkupExample,
  transitionWordsExample,
} from "./examples.js";

interface RecommendationOutput {
  text: string;
  steps?: string[];
  codeExample?: string;
  learnMoreUrl?: string;
}

type RecommendationBuilder = (
  rawData: AuditRawDataType,
) => RecommendationOutput;

function constantRecommendation(text: string): RecommendationBuilder {
  return () => ({ text });
}

export const RECOMMENDATION_BUILDERS: Record<string, RecommendationBuilder> = {
  "Fetch Success": constantRecommendation(
    "Ensure the page returns HTTP 200 without excessive redirect chains. AI engines cannot extract content from pages that fail to load.",
  ),

  "Text Extraction Quality": constantRecommendation(
    "Improve the ratio of meaningful text content to markup. Pages with very low text density are harder for AI engines to extract useful content from.",
  ),

  "Boilerplate Ratio": constantRecommendation(
    "Reduce boilerplate content (navigation, footers, sidebars) relative to main content. Use semantic HTML elements like <main> and <article> to help engines isolate your content.",
  ),

  "Word Count Adequacy": (rawData) => {
    const count = rawData.wordCount;
    if (count < 100) {
      return {
        text: `Your page has ${count} words, which is too thin for AI engines to reference. The ideal range is 300-3000 words.`,
      };
    }
    if (count < 300) {
      return {
        text: `Your page has ${count} words. AI engines prefer 300-3000 words for comprehensive coverage. Consider expanding your content.`,
      };
    }
    return {
      text: `Your page has ${count} words, which exceeds the ideal 300-3000 word range. Consider splitting into multiple focused pages.`,
    };
  },

  "AI Crawler Access": (rawData) => {
    const access = rawData.crawlerAccess;
    if (!access || access.blocked.length === 0) {
      return {
        text: "Ensure AI crawlers like GPTBot, ClaudeBot, and PerplexityBot are allowed in your robots.txt.",
        steps: [
          "Check your robots.txt for Disallow rules targeting AI crawlers",
          "Add explicit Allow rules for each AI crawler you want to reach your content",
        ],
        learnMoreUrl:
          "https://developers.google.com/search/docs/crawling-indexing/robots/intro",
      };
    }
    const blocked = access.blocked;
    const blockedList = blocked.join(", ");
    const codeExample = `# Add these rules to your robots.txt:\n\n${blocked.map((c) => `User-agent: ${c}\nAllow: /`).join("\n\n")}`;
    if (access.allowed.length > 0) {
      const allowed = access.allowed.join(", ");
      return {
        text: `Your robots.txt is blocking ${blockedList}. ${allowed} ${access.allowed.length === 1 ? "is" : "are"} allowed. Unblock all AI crawlers so your content can be discovered and cited.`,
        steps: [
          "Open your robots.txt file (usually at the site root)",
          `Remove any Disallow rules for: ${blockedList}`,
          "Add the Allow rules shown in the code example",
          "Deploy and verify at yoursite.com/robots.txt",
        ],
        codeExample,
        learnMoreUrl:
          "https://developers.google.com/search/docs/crawling-indexing/robots/intro",
      };
    }
    return {
      text: `Your robots.txt is blocking ${blockedList}. Blocking these crawlers means your content cannot be discovered or cited by AI engines.`,
      steps: [
        "Open your robots.txt file (usually at the site root)",
        `Remove any Disallow rules for: ${blockedList}`,
        "Add the Allow rules shown in the code example",
        "Deploy and verify at yoursite.com/robots.txt",
      ],
      codeExample,
      learnMoreUrl:
        "https://developers.google.com/search/docs/crawling-indexing/robots/intro",
    };
  },

  "LLMs.txt Presence": (rawData) => {
    const llms = rawData.llmsTxt;
    const title = rawData.title || "Your Site Name";
    const description =
      rawData.metaDescription || "Brief description of your site";

    const missingFiles: string[] = [];
    if (!llms?.llmsTxtExists) missingFiles.push("llms.txt");
    if (!llms?.llmsFullTxtExists) missingFiles.push("llms-full.txt");

    if (missingFiles.length === 0) {
      return { text: "Both llms.txt and llms-full.txt are present." };
    }

    const isLlmsMissing = !llms?.llmsTxtExists;
    const codeExample = isLlmsMissing
      ? `# llms.txt\n\n# ${title}\n\n> ${description}\n\n## Docs\n\n- [About](/about): Learn more about ${title}\n- [Documentation](/docs): Technical documentation`
      : `# llms-full.txt\n\n# ${title} — Full Documentation\n\n> ${description}\n\nThis file provides comprehensive documentation for AI systems to understand and accurately reference ${title}.`;

    const fileName = missingFiles[0];

    if (llms?.llmsTxtExists && !llms?.llmsFullTxtExists) {
      return {
        text: "You have llms.txt but are missing llms-full.txt. Adding llms-full.txt provides AI systems with a comprehensive version of your site documentation for deeper ingestion.",
        steps: [
          "Create llms-full.txt at your domain root (e.g., yoursite.com/llms-full.txt)",
          "Include your site's full documentation, purpose, key features, and FAQ",
          "Deploy so the file is accessible via HTTP GET",
          "Verify by visiting yoursite.com/llms-full.txt",
        ],
        codeExample,
        learnMoreUrl: "https://llmstxt.org",
      };
    }
    if (!llms?.llmsTxtExists && llms?.llmsFullTxtExists) {
      return {
        text: "You have llms-full.txt but are missing llms.txt. Adding llms.txt provides AI systems with a concise structured overview of your site's purpose and key pages.",
        steps: [
          "Create llms.txt at your domain root (e.g., yoursite.com/llms.txt)",
          "Include your site's purpose, key pages, and documentation links (see code example)",
          "Deploy so the file is accessible via HTTP GET",
          "Verify by visiting yoursite.com/llms.txt",
        ],
        codeExample,
        learnMoreUrl: "https://llmstxt.org",
      };
    }
    return {
      text: `Missing ${missingFiles.join(" and ")}. These files help AI systems understand and accurately cite your site.`,
      steps: [
        `Create ${fileName} at your domain root (e.g., yoursite.com/${fileName})`,
        "Fill in your site's purpose, key pages, and documentation links (see code example)",
        "Deploy so the file is accessible via HTTP GET",
        `Verify by visiting yoursite.com/${fileName}`,
      ],
      codeExample,
      learnMoreUrl: "https://llmstxt.org",
    };
  },

  "Image Accessibility": (rawData) => {
    const images = rawData.imageAccessibility;

    const altTextSteps = [
      "Add a descriptive alt attribute to every <img> tag",
      "Write alt text that describes what the image shows, not just its file name",
      'Leave alt empty (alt="") for purely decorative images',
      "Wrap images that need caption context in <figure> with a <figcaption>",
    ];

    if (!images || images.imageCount === 0) {
      return {
        text: "Add descriptive alt text to all images and use <figure> with <figcaption> for semantic image context.",
        steps: altTextSteps,
        codeExample: imageAltTextExample,
      };
    }

    const imagesWithoutAlt = images.imageCount - images.imagesWithAlt;
    const altCoveragePercent = Math.round(
      (images.imagesWithAlt / images.imageCount) * 100,
    );

    let text = `${images.imagesWithAlt} of your ${images.imageCount} images have alt text (${altCoveragePercent}%). `;
    if (imagesWithoutAlt > 0) {
      text += `Add alt text to the remaining ${imagesWithoutAlt} image${imagesWithoutAlt === 1 ? "" : "s"}. `;
    }
    if (images.figcaptionCount === 0) {
      text +=
        "Consider using <figure> with <figcaption> for images that need descriptive context.";
    }

    return { text, steps: altTextSteps, codeExample: imageAltTextExample };
  },

  "Heading Hierarchy": (rawData) => {
    const title = rawData.title || "Your Page Topic";
    const topic = title.split(" ").slice(-2).join(" ");
    return {
      text: "Use a clear H1 > H2 > H3 heading hierarchy. Headings serve as structural anchors that AI engines use to segment and reuse content.",
      steps: [
        "Use exactly 1 H1 tag for the main page title",
        "Use H2 tags for major sections (aim for 3+ sections)",
        "Use H3 tags for subsections within each H2",
        "Never skip levels (e.g., don't jump from H1 to H3)",
        "Frame H2s as questions when possible for answer capsule compatibility",
      ],
      codeExample: `<!-- Recommended heading structure -->
<h1>${title}</h1>

<h2>What is ${topic}?</h2>
<p>Definition and overview...</p>

  <h3>Key Features</h3>
  <p>Details...</p>

<h2>Why Does ${topic} Matter?</h2>
<p>Importance and context...</p>

<h2>How to Get Started</h2>
<p>Step-by-step guide...</p>`,
    };
  },

  "Lists Presence": () => ({
    text: "Add bulleted or numbered lists to organize information. Lists are easily extracted and reused by AI engines.",
    steps: [
      "Identify prose that enumerates 3 or more items in a sentence",
      "Convert those sentences into <ul> or <ol> list elements",
      "Use <ol> for sequential steps and <ul> for unordered collections",
      "Keep list items parallel — each starting with the same grammatical form",
    ],
    codeExample: listsConversionExample,
  }),

  "Tables Presence": () => ({
    text: "Consider adding data tables for comparative or structured data. Tables are highly parseable by AI engines.",
    steps: [
      "Identify any comparisons, pricing tiers, specs, or feature matrices in your content",
      "Structure them as HTML <table> elements with a <thead> and <tbody>",
      "Add a <caption> element describing what the table shows",
      "Ensure every column has a clear <th> header so AI engines can map values to labels",
    ],
    codeExample: tablesMarkupExample,
  }),

  "Paragraph Structure": constantRecommendation(
    "Keep paragraphs between 30-150 words for optimal readability and extractability.",
  ),

  Scannability: constantRecommendation(
    "Use bold text, short paragraphs, and frequent headings to improve scannability for both humans and AI.",
  ),

  "Section Length": (rawData) => {
    const sections = rawData.sectionLengths;
    if (!sections || sections.sectionCount === 0) {
      return {
        text: "Add headings to create distinct sections. Each headed section should be a self-contained unit that an AI engine could extract and reuse.",
      };
    }
    const avg = Math.round(sections.avgWordsPerSection);
    if (avg < 120) {
      return {
        text: `Your sections average ${avg} words. The citation sweet spot is 120-180 words. Consider expanding sections with more detail rather than splitting into many short fragments.`,
      };
    }
    return {
      text: `Your sections average ${avg} words. The citation sweet spot is 120-180 words. Consider adding more subheadings to break up long sections into self-contained units.`,
    };
  },

  "Definition Patterns": (rawData) => {
    const detectedTopic = rawData.entities?.topics?.[0];
    const primaryTerm = detectedTopic ?? "AI SEO";
    const codeExample = `<!-- Inline definition on first use -->
<p>${primaryTerm} is defined as [your one-sentence definition here].</p>

<!-- Definition list for multiple terms -->
<dl>
  <dt>${primaryTerm}</dt>
  <dd>[A clear, concise definition that AI engines can extract and reuse.]</dd>

  <dt>[Second key term]</dt>
  <dd>[The definition of your second most important concept.]</dd>
</dl>`;
    return {
      text: 'Define key terms and concepts clearly (e.g., "X is defined as..." or "X refers to..."). Clear definitions are directly reusable by AI engines.',
      steps: [
        "Identify the 3 to 5 key terms central to your page topic",
        "Add a one-sentence definition for each using the 'X is' or 'X refers to' pattern",
        "Place each definition early in the section that first uses the term",
        "Use a <dl> definition list when the page covers many terms",
      ],
      codeExample,
    };
  },

  "Direct Answer Statements": () => ({
    text: "Start key sentences with direct statements that could serve as standalone answers.",
    steps: [
      "Find paragraphs where the main point is buried after qualifications or context",
      "Move the core assertion to the first sentence of the paragraph",
      "Write opening sentences so they can stand alone as a complete answer",
      "Follow the direct statement with supporting detail, examples, and caveats",
    ],
    codeExample: directAnswerExample,
  }),

  "Answer Capsules": (rawData) => {
    const capsules = rawData.answerCapsules;
    const detectedQuestion = rawData.questionsFound?.[0];
    const steps = [
      "Rewrite H2 headings as questions your audience would ask an AI (e.g., 'Benefits of X' → 'What are the benefits of X?')",
      "Place a 1-2 sentence direct answer (under 200 characters) as the first paragraph after each H2",
      "Start the answer with a definitive statement, not a qualifier",
      "Follow the capsule with detailed supporting content",
    ];
    const codeExample = detectedQuestion
      ? `<!-- Before -->
<h2>${detectedQuestion.replace(/\?$/, "").replace(/^(what|how|why|when|where|who)\s+/i, (m) => m.charAt(0).toUpperCase() + m.slice(1))}</h2>
<p>There are many reasons to consider this topic today...</p>

<!-- After (answer capsule pattern) -->
<h2>${detectedQuestion.endsWith("?") ? detectedQuestion : `${detectedQuestion}?`}</h2>
<p>[Your direct, one-sentence answer here — under 200 characters.]</p>
<p>[Supporting detail and context follows...]</p>`
      : answerCapsuleExample;

    if (!capsules || capsules.total === 0) {
      return {
        text: "Frame your H2 headings as questions and place a concise answer (under 200 characters) in the first sentence. 72% of AI-cited content uses this pattern.",
        steps,
        codeExample,
      };
    }
    const missing = capsules.total - capsules.withCapsule;
    return {
      text: `${capsules.withCapsule} of your ${capsules.total} question-framed H2s have a concise answer capsule. Add a short, direct answer (under 200 characters) as the first sentence after the remaining ${missing}. 72% of AI-cited content uses this pattern.`,
      steps,
      codeExample,
    };
  },

  "Step-by-Step Content": constantRecommendation(
    "Break down processes into clear, numbered steps. Step-by-step content is highly reusable by AI engines.",
  ),

  "Q/A Patterns": (rawData) => {
    const questions = rawData.questionsFound;
    if (!questions || questions.length === 0) {
      return {
        text: 'Include and answer common questions your audience might have. Structure content to directly answer "what is", "how to" style queries.',
      };
    }
    return {
      text: `Found ${questions.length} question${questions.length === 1 ? "" : "s"} in your content. Add more question-and-answer patterns to cover the queries your audience asks AI engines.`,
    };
  },

  "Summary/Conclusion": () => ({
    text: "Add a conclusion section with key takeaways or a summary. This helps AI engines quickly extract the main points.",
    steps: [
      "Add an H2 heading at the end of the page: 'Summary', 'Key Takeaways', or 'Conclusion'",
      "List 3 to 5 bullet points covering the most important points from the page",
      "Keep each bullet to one sentence — conclusion bullets are the most-cited part of a page",
      "Optionally follow the summary with a 'Next Steps' or 'Learn More' section",
    ],
    codeExample: summaryStructureExample,
  }),

  "Entity Richness": (rawData) => {
    const entities = rawData.entities;
    const minimumRecommendedEntities = 9;

    const howToAddEntitiesSteps = [
      "Name the key people, organizations, and places relevant to your topic",
      "Link people and organizations to authoritative sources like Wikipedia or official sites",
      "Add context for each entity: their role, location, or relevance to the topic",
      `Aim for ${minimumRecommendedEntities} or more distinct named entities per page`,
    ];

    if (!entities) {
      return {
        text: "Reference relevant experts, organizations, and places in your field. Named entities help AI engines understand context.",
        steps: howToAddEntitiesSteps,
      };
    }

    const detectedEntityCount =
      entities.people.length +
      entities.organizations.length +
      entities.places.length +
      entities.topics.length;

    const entityBreakdownParts: string[] = [];
    if (entities.people.length > 0)
      entityBreakdownParts.push(`${entities.people.length} people`);
    if (entities.organizations.length > 0)
      entityBreakdownParts.push(
        `${entities.organizations.length} organizations`,
      );
    if (entities.places.length > 0)
      entityBreakdownParts.push(`${entities.places.length} places`);
    if (entities.topics.length > 0)
      entityBreakdownParts.push(`${entities.topics.length} topics`);

    if (detectedEntityCount === 0) {
      return {
        text: "No named entities were detected. Reference specific people, organizations, and places to help AI engines understand what your content is about.",
        steps: howToAddEntitiesSteps,
      };
    }

    return {
      text: `Found ${detectedEntityCount} unique entities (${entityBreakdownParts.join(", ")}). AI engines perform best with ${minimumRecommendedEntities}+ distinct entities. Add more specific names, organizations, and places relevant to your topic.`,
      steps: howToAddEntitiesSteps,
    };
  },

  "Topic Consistency": constantRecommendation(
    "Align your main topics with your title and headings. Topic consistency helps AI engines understand what your page is about.",
  ),

  "Entity Density": constantRecommendation(
    "Ensure a balanced density of named entities (2-8 per 100 words). Too few makes content vague; too many makes it hard to parse.",
  ),

  "External References": (rawData) => {
    const externalLinks = rawData.externalLinks;
    const linkCount = externalLinks?.length ?? 0;
    const minimumRecommendedLinks = 6;

    const howToAddReferenceSteps = [
      "Identify factual claims that can be supported by an external source",
      "Find authoritative sources: research papers, industry reports, official documentation",
      "Wrap the linked text in a meaningful anchor — describe what you are linking to, not 'click here'",
      `Aim for ${minimumRecommendedLinks} or more external links per page`,
    ];

    const firstLink = externalLinks?.[0];
    const linkedCitationExample = firstLink
      ? `<!-- Anchor an external reference to the claim it supports -->
<p>
  As referenced in <a href="${firstLink.url}"
  rel="noopener">${firstLink.text || "this source"}</a>, [your claim here].
</p>

<!-- Add more references using the same pattern -->
<p>
  According to <a href="[source-url]" rel="noopener">[Source Name]</a>,
  [another claim supported by evidence].
</p>`
      : `<!-- Anchor an external reference to the claim it supports -->
<p>
  Structured content is cited 3x more often by AI engines,
  according to <a href="https://arxiv.org/abs/2311.09735"
  rel="noopener">Princeton's GEO research</a>.
</p>`;

    if (linkCount === 0) {
      return {
        text: "Add links to reputable external sources to ground your claims. AI engines use external references to verify and attribute information.",
        steps: howToAddReferenceSteps,
        codeExample: linkedCitationExample,
      };
    }

    return {
      text: `Found ${linkCount} external link${linkCount === 1 ? "" : "s"}. AI engines prefer content with ${minimumRecommendedLinks}+ external references. Add more links to authoritative sources that support your claims.`,
      steps: howToAddReferenceSteps,
      codeExample: linkedCitationExample,
    };
  },

  "Citation Patterns": () => ({
    text: 'Use formal citation patterns (e.g., [1], "according to") when referencing sources.',
    steps: [
      "Add in-text citation markers like [1] or (Author, Year) after specific claims",
      "Include a 'References' or 'Sources' section at the bottom of the page",
      "Use <cite> elements around titles of books, articles, or research papers",
      "Link each citation marker to its corresponding reference entry",
    ],
    codeExample: citationMarkupExample,
  }),

  "Numeric Claims": constantRecommendation(
    "Include relevant statistics and data points to support your content with verifiable claims.",
  ),

  "Attribution Indicators": () => ({
    text: 'Attribute claims to specific sources or experts. Phrases like "according to" help AI engines trace information.',
    steps: [
      "Identify factual claims that currently have no source",
      "Prepend 'According to [Source]' or 'Per [Organization]' before each claim",
      "Link the source name to its original URL so AI engines can follow the reference",
      "Add a citation marker (e.g., [1]) for formal references tied to a sources section",
    ],
    codeExample: attributionIndicatorExample,
  }),

  "Quoted Attribution": () => ({
    text: 'Add expert quotes with clear attribution. Use patterns like "Quote text" — Expert Name, or "Quote text," said Expert Name. Research shows quotation addition increased AI visibility by 30-40%.',
    steps: [
      "Find a relevant quote from an expert, publication, or research paper",
      "Wrap it in a <blockquote> with a <footer> containing a <cite> attribution",
      "Include the expert's full name, title, and organization",
      "Link the attribution to the original source where possible",
    ],
    codeExample: blockquoteAttributionExample,
    learnMoreUrl:
      "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote",
  }),

  "Author Attribution": (rawData) => {
    const authorName = rawData.entities?.people?.[0] || "Author Name";
    const slug = authorName.toLowerCase().replace(/\s+/g, "-");
    return {
      text: "Add visible author information with a byline to establish content credibility and enable AI attribution.",
      steps: [
        "Add a visible byline near the top of the article (after the H1)",
        `Link the author name to an about/bio page using rel="author"`,
        "Add author information to your JSON-LD schema (see code example)",
      ],
      codeExample: `<!-- Add a visible byline -->
<p class="byline">By <a href="/about/${slug}" rel="author">${authorName}</a></p>

<!-- Add to your JSON-LD schema -->
"author": {
  "@type": "Person",
  "name": "${authorName}",
  "url": "https://yoursite.com/about/${slug}"
}`,
      learnMoreUrl: "https://schema.org/author",
    };
  },

  "Organization Identity": (rawData) => {
    const detectedOrgName =
      rawData.entities?.organizations?.[0] ?? "Your Organization";
    return {
      text: "Add Organization structured data or og:site_name to help engines identify the source.",
      steps: [
        "Add an og:site_name meta tag to every page's <head>",
        "Add an Organization JSON-LD block to your site's global <head>",
        "Ensure the organization name is identical across JSON-LD, og:site_name, and visible page content",
      ],
      codeExample: `<!-- og:site_name in <head> -->
<meta property="og:site_name" content="${detectedOrgName}">

<!-- Organization JSON-LD (add to global site header) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "${detectedOrgName}",
  "url": "https://yoursite.com",
  "logo": "https://yoursite.com/logo.png",
  "sameAs": [
    "https://twitter.com/yourhandle",
    "https://linkedin.com/company/yourcompany"
  ]
}
</script>`,
      learnMoreUrl: "https://schema.org/Organization",
    };
  },

  "Contact/About Links": () => ({
    text: "Link to About and Contact pages to establish credibility and enable source verification.",
    steps: [
      "Add links to your About and Contact pages in the site navigation",
      "Include them in the footer of every page",
      "Ensure the links are reachable via plain anchor tags — not JavaScript-only interactions",
    ],
    codeExample: contactLinksExample,
  }),

  "Publication Date": () => {
    const today = new Date().toISOString().split("T")[0];
    return {
      text: "Include publication and last-updated dates using proper HTML5 time elements or schema markup.",
      steps: [
        "Add a visible publication date near the article title or byline",
        "Wrap the date in a <time> element with a machine-readable datetime attribute",
        "Add datePublished and dateModified to your JSON-LD schema",
      ],
      codeExample: `<!-- Visible dates with <time> elements -->
<p>Published: <time datetime="${today}" itemprop="datePublished">${today}</time></p>
<p>Updated: <time datetime="${today}" itemprop="dateModified">${today}</time></p>

<!-- In your JSON-LD schema -->
"datePublished": "${today}",
"dateModified": "${today}"`,
      learnMoreUrl: "https://schema.org/datePublished",
    };
  },

  "Content Freshness": (rawData) => {
    const freshness = rawData.freshness;
    const today = new Date().toISOString().split("T")[0];
    const codeExample = `<!-- Add/update in your HTML -->
<time datetime="${today}" itemprop="dateModified">${today}</time>

<!-- Add/update in your JSON-LD -->
"dateModified": "${today}"`;
    const steps = [
      "Review and update your content with current information",
      "Update the dateModified in both visible HTML and JSON-LD schema (see code example)",
      "Set up a recurring reminder to review content every 6 months",
    ];

    if (!freshness || freshness.ageInMonths === null) {
      return {
        text: "Add a publication or modified date to your content. 65% of AI crawler hits target content less than 1 year old. Without a parseable date, AI engines may deprioritize your content.",
        steps: [
          "Add a <time> element with a datetime attribute to your page",
          "Add datePublished and dateModified to your JSON-LD schema",
          steps[2],
        ],
        codeExample,
      };
    }
    const months = Math.round(freshness.ageInMonths);
    let text: string;
    if (months > 24) {
      text = `Your content was last updated ${months} months ago. AI engines strongly prefer content less than 12 months old. Consider updating with current information and refreshing the modified date.`;
    } else if (months > 12) {
      text = `Your content was last updated ${months} months ago. 65% of AI crawler hits target content less than 1 year old. Refresh your content and update the modified date.`;
    } else if (!freshness.hasModifiedDate) {
      text = `Your content has a publish date but no modified date. Adding a dateModified signal shows active maintenance and gives a freshness boost with AI engines.`;
    } else {
      text =
        "Update your content to include a recent publication or modified date. Content freshness acts as a hard gate for AI engine citations.";
    }
    return { text, steps, codeExample };
  },

  "Structured Data": (rawData) => {
    const types = rawData.structuredDataTypes;
    if (types && types.length > 0) {
      return {
        text: `Found ${types.join(", ")} schema${types.length === 1 ? "" : "s"}. Ensure you also have Open Graph tags (og:title, og:description, og:image) and a canonical URL for complete structured data coverage.`,
        steps: [
          "Verify all JSON-LD types have required properties (check Schema Completeness factor)",
          `Add og:title, og:description, and og:image meta tags if missing`,
          `Add a <link rel="canonical"> tag pointing to the preferred URL`,
        ],
        learnMoreUrl: "https://schema.org/docs/gs.html",
      };
    }

    const title = rawData.title || "Your Page Title";
    const description = rawData.metaDescription || "Your page description";
    const schemaType = rawData.questionsFound?.length ? "FAQPage" : "Article";
    const today = new Date().toISOString().split("T")[0];

    let codeExample: string;
    if (schemaType === "FAQPage" && rawData.questionsFound?.length) {
      const questions = rawData.questionsFound.slice(0, 3);
      const faqEntries = questions
        .map(
          (q) => `    {
      "@type": "Question",
      "name": "${q}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Your answer here"
      }
    }`,
        )
        .join(",\n");
      codeExample = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
${faqEntries}
  ]
}
</script>`;
    } else {
      codeExample = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${title}",
  "description": "${description}",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Your Organization"
  },
  "datePublished": "${today}",
  "dateModified": "${today}"
}
</script>`;
    }

    return {
      text: "Add JSON-LD structured data and Open Graph tags to provide machine-readable context.",
      steps: [
        `Add a ${schemaType} JSON-LD block to your <head> (see code example)`,
        "Fill in author, publisher, and date fields with real values",
        "Add og:title, og:description, and og:image <meta> tags",
        `Add a <link rel="canonical"> pointing to the preferred URL`,
        "Validate at https://search.google.com/test/rich-results",
      ],
      codeExample,
      learnMoreUrl: "https://schema.org/docs/gs.html",
    };
  },

  "Schema Completeness": (rawData) => {
    const schema = rawData.schemaCompleteness;
    if (!schema || schema.details.length === 0) {
      return {
        text: "Add JSON-LD schema with all recommended properties. Complete schemas help AI engines attribute and trust your content.",
        learnMoreUrl: "https://schema.org/docs/gs.html",
      };
    }
    const incomplete = schema.details.filter((d) => d.missing.length > 0);
    if (incomplete.length === 0) {
      return {
        text: "Ensure your JSON-LD schema types include all recommended properties for maximum AI engine trust.",
      };
    }
    const summaries = incomplete.map(
      (d) => `${d.type} is missing ${d.missing.join(", ")}`,
    );
    const primary = incomplete[0];
    const placeholders: Record<string, string> = {
      headline: `"headline": "${rawData.title || "Your headline"}"`,
      author: `"author": { "@type": "Person", "name": "Author Name" }`,
      datePublished: `"datePublished": "${new Date().toISOString().split("T")[0]}"`,
      dateModified: `"dateModified": "${new Date().toISOString().split("T")[0]}"`,
      description: `"description": "${rawData.metaDescription || "Your description"}"`,
      image: `"image": "https://yoursite.com/image.jpg"`,
      publisher: `"publisher": { "@type": "Organization", "name": "Your Org" }`,
      name: `"name": "${rawData.title || "Your Name"}"`,
      url: `"url": "https://yoursite.com"`,
      mainEntity: `"mainEntity": []`,
      step: `"step": [{ "@type": "HowToStep", "text": "Step 1..." }]`,
      address: `"address": { "@type": "PostalAddress", "streetAddress": "..." }`,
    };
    const missingProps = primary.missing.map(
      (prop) => placeholders[prop] || `"${prop}": "..."`,
    );
    const codeExample = `// Add these properties to your existing ${primary.type} schema:\n{\n  ${missingProps.join(",\n  ")}\n}`;
    return {
      text: `Your ${summaries.join("; ")}. Adding these properties helps AI engines attribute and trust your content.`,
      steps: incomplete.map(
        (d) => `Add ${d.missing.join(", ")} to your ${d.type} schema`,
      ),
      codeExample,
      learnMoreUrl: `https://schema.org/${primary.type}`,
    };
  },

  "Entity Consistency": (rawData) => {
    const ec = rawData.entityConsistency;
    if (!ec || !ec.entityName) {
      return {
        text: "Add a consistent brand or organization name across your page title, OG tags, JSON-LD schema, and footer. Consistent entity signals help AI engines confidently attribute content to your brand.",
      };
    }
    return {
      text: `"${ec.entityName}" was found on ${ec.surfacesFound} of ${ec.surfacesChecked} page surfaces. Ensure it appears consistently in the page title, OG tags, schema, and footer for strong brand attribution.`,
    };
  },

  "Sentence Length": (rawData) => {
    const avg = rawData.avgSentenceLength;
    if (avg === undefined) {
      return {
        text: "Aim for an average sentence length of 12-22 words for optimal readability and compressibility.",
      };
    }
    const rounded = Math.round(avg);
    if (rounded > 22) {
      return {
        text: `Your average sentence is ${rounded} words. The ideal range for AI compression is 12-22 words. Break long sentences into shorter, more direct statements.`,
      };
    }
    if (rounded < 12) {
      return {
        text: `Your average sentence is ${rounded} words. While short sentences are readable, combining some into 12-22 word sentences provides better context for AI summarization.`,
      };
    }
    return {
      text: `Your average sentence length is ${rounded} words. Fine-tune toward the 12-22 word sweet spot for optimal AI compression.`,
    };
  },

  Readability: (rawData) => {
    const score = rawData.readabilityScore;
    if (score === undefined) {
      return {
        text: "Simplify language where possible. A Flesch Reading Ease score of 60-70 is ideal for broad AI reusability.",
      };
    }
    const rounded = Math.round(score);
    if (rounded < 30) {
      return {
        text: `Your Flesch Reading Ease score is ${rounded} (very difficult). A score of 60-70 is ideal. Shorten sentences, use simpler vocabulary, and break up complex ideas.`,
      };
    }
    if (rounded < 50) {
      return {
        text: `Your Flesch Reading Ease score is ${rounded} (difficult). A score of 60-70 is ideal for broad AI reusability. Simplify where possible without losing meaning.`,
      };
    }
    if (rounded < 60) {
      return {
        text: `Your Flesch Reading Ease score is ${rounded} (fairly difficult). You're close to the ideal 60-70 range. Minor simplification would improve AI compressibility.`,
      };
    }
    return {
      text: `Your Flesch Reading Ease score is ${rounded}. A score of 60-70 is ideal for broad AI reusability.`,
    };
  },

  "Jargon Density": () => ({
    text: "Define technical terms or replace with simpler alternatives. High jargon density reduces AI reusability.",
    steps: [
      "List the 5 most domain-specific terms on the page",
      "For each term: either add a plain-English definition on first use, or replace with simpler language",
      "Use the 'is defined as' or 'also known as' pattern for terms you must keep",
      "Aim for a Flesch Reading Ease score of 60 to 70 by simplifying sentence structure",
    ],
    codeExample: jargonReductionExample,
  }),

  "Transition Usage": () => ({
    text: "Use transition words (however, therefore, additionally) to improve content flow and logical structure.",
    steps: [
      "Add contrast transitions between opposing ideas: 'however', 'although', 'on the other hand'",
      "Add sequence transitions between steps or points: 'first', 'next', 'finally'",
      "Add addition transitions to build on a point: 'additionally', 'furthermore', 'in addition'",
      "Add conclusion transitions at the end of sections: 'therefore', 'as a result', 'in summary'",
    ],
    codeExample: transitionWordsExample,
  }),
};
