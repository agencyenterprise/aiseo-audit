import type { AuditRawDataType } from "../audits/schema.js";

type RecommendationBuilder = (rawData: AuditRawDataType) => string;

function static_(text: string): RecommendationBuilder {
  return () => text;
}

export const RECOMMENDATION_BUILDERS: Record<string, RecommendationBuilder> = {
  "Fetch Success": static_(
    "Ensure the page returns HTTP 200 without excessive redirect chains. AI engines cannot extract content from pages that fail to load.",
  ),

  "Text Extraction Quality": static_(
    "Improve the ratio of meaningful text content to markup. Pages with very low text density are harder for AI engines to extract useful content from.",
  ),

  "Boilerplate Ratio": static_(
    "Reduce boilerplate content (navigation, footers, sidebars) relative to main content. Use semantic HTML elements like <main> and <article> to help engines isolate your content.",
  ),

  "Word Count Adequacy": (rawData) => {
    const count = rawData.wordCount;
    if (count < 100) {
      return `Your page has ${count} words, which is too thin for AI engines to reference. The ideal range is 300-3000 words.`;
    }
    if (count < 300) {
      return `Your page has ${count} words. AI engines prefer 300-3000 words for comprehensive coverage. Consider expanding your content.`;
    }
    return `Your page has ${count} words, which exceeds the ideal 300-3000 word range. Consider splitting into multiple focused pages.`;
  },

  "AI Crawler Access": (rawData) => {
    const access = rawData.crawlerAccess;
    if (!access || access.blocked.length === 0) {
      return "Ensure AI crawlers like GPTBot, ClaudeBot, and PerplexityBot are allowed in your robots.txt.";
    }
    const blocked = access.blocked.join(", ");
    if (access.allowed.length > 0) {
      const allowed = access.allowed.join(", ");
      return `Your robots.txt is blocking ${blocked}. ${allowed} ${access.allowed.length === 1 ? "is" : "are"} allowed. Unblock all AI crawlers so your content can be discovered and cited.`;
    }
    return `Your robots.txt is blocking ${blocked}. Blocking these crawlers means your content cannot be discovered or cited by AI engines.`;
  },

  "LLMs.txt Presence": static_(
    "Consider adding llms.txt and llms-full.txt files at your domain root. This emerging standard provides AI systems with a structured overview of your site, helping them understand and reference your content more effectively.",
  ),

  "Image Accessibility": (rawData) => {
    const images = rawData.imageAccessibility;
    if (!images || images.imageCount === 0) {
      return "Add descriptive alt text to all images and use <figure> with <figcaption> for semantic image context.";
    }
    const pct = Math.round((images.imagesWithAlt / images.imageCount) * 100);
    const missing = images.imageCount - images.imagesWithAlt;
    let text = `${images.imagesWithAlt} of your ${images.imageCount} images have alt text (${pct}%). `;
    if (missing > 0) {
      text += `Add alt text to the remaining ${missing} image${missing === 1 ? "" : "s"}. `;
    }
    if (images.figcaptionCount === 0) {
      text +=
        "Consider using <figure> with <figcaption> for images that need descriptive context.";
    }
    return text;
  },

  "Heading Hierarchy": static_(
    "Use a clear H1 > H2 > H3 heading hierarchy. Headings serve as structural anchors that AI engines use to segment and reuse content.",
  ),

  "Lists Presence": static_(
    "Add bulleted or numbered lists to organize information. Lists are easily extracted and reused by AI engines.",
  ),

  "Tables Presence": static_(
    "Consider adding data tables for comparative or structured data. Tables are highly parseable by AI engines.",
  ),

  "Paragraph Structure": static_(
    "Keep paragraphs between 30-150 words for optimal readability and extractability.",
  ),

  Scannability: static_(
    "Use bold text, short paragraphs, and frequent headings to improve scannability for both humans and AI.",
  ),

  "Section Length": (rawData) => {
    const sections = rawData.sectionLengths;
    if (!sections || sections.sectionCount === 0) {
      return "Add headings to create distinct sections. Each headed section should be a self-contained unit that an AI engine could extract and reuse.";
    }
    const avg = Math.round(sections.avgWordsPerSection);
    if (avg < 120) {
      return `Your sections average ${avg} words. The citation sweet spot is 120-180 words. Consider expanding sections with more detail rather than splitting into many short fragments.`;
    }
    return `Your sections average ${avg} words. The citation sweet spot is 120-180 words. Consider adding more subheadings to break up long sections into self-contained units.`;
  },

  "Definition Patterns": static_(
    'Define key terms and concepts clearly (e.g., "X is defined as..." or "X refers to..."). Clear definitions are directly reusable by AI engines.',
  ),

  "Direct Answer Statements": static_(
    "Start key sentences with direct statements that could serve as standalone answers.",
  ),

  "Answer Capsules": (rawData) => {
    const capsules = rawData.answerCapsules;
    if (!capsules || capsules.total === 0) {
      return 'Frame your H2 headings as questions (e.g., "What is X?") and place a concise answer (under 200 characters) in the first sentence of the following paragraph. 72% of AI-cited content uses this pattern.';
    }
    const missing = capsules.total - capsules.withCapsule;
    return `${capsules.withCapsule} of your ${capsules.total} question-framed H2s have a concise answer capsule. Add a short, direct answer (under 200 characters) as the first sentence after the remaining ${missing}. 72% of AI-cited content uses this pattern.`;
  },

  "Step-by-Step Content": static_(
    "Break down processes into clear, numbered steps. Step-by-step content is highly reusable by AI engines.",
  ),

  "Q/A Patterns": (rawData) => {
    const questions = rawData.questionsFound;
    if (!questions || questions.length === 0) {
      return 'Include and answer common questions your audience might have. Structure content to directly answer "what is", "how to" style queries.';
    }
    return `Found ${questions.length} question${questions.length === 1 ? "" : "s"} in your content. Add more question-and-answer patterns to cover the queries your audience asks AI engines.`;
  },

  "Summary/Conclusion": static_(
    "Add a conclusion section with key takeaways or a summary. This helps AI engines quickly extract the main points.",
  ),

  "Entity Richness": (rawData) => {
    const entities = rawData.entities;
    if (!entities) {
      return "Reference relevant experts, organizations, and places in your field. Named entities help AI engines understand context.";
    }
    const total =
      entities.people.length +
      entities.organizations.length +
      entities.places.length +
      entities.topics.length;
    const parts: string[] = [];
    if (entities.people.length > 0)
      parts.push(`${entities.people.length} people`);
    if (entities.organizations.length > 0)
      parts.push(`${entities.organizations.length} organizations`);
    if (entities.places.length > 0)
      parts.push(`${entities.places.length} places`);
    if (entities.topics.length > 0)
      parts.push(`${entities.topics.length} topics`);
    if (total === 0) {
      return "No named entities were detected. Reference specific people, organizations, and places to help AI engines understand what your content is about.";
    }
    return `Found ${total} unique entities (${parts.join(", ")}). AI engines perform best with 9+ distinct entities. Add more specific names, organizations, and places relevant to your topic.`;
  },

  "Topic Consistency": static_(
    "Align your main topics with your title and headings. Topic consistency helps AI engines understand what your page is about.",
  ),

  "Entity Density": static_(
    "Ensure a balanced density of named entities (2-8 per 100 words). Too few makes content vague; too many makes it hard to parse.",
  ),

  "External References": (rawData) => {
    const links = rawData.externalLinks;
    if (!links || links.length === 0) {
      return "Add links to reputable external sources to ground your claims. AI engines use external references to verify and attribute information.";
    }
    return `Found ${links.length} external link${links.length === 1 ? "" : "s"}. AI engines prefer content with 6+ external references. Add more links to authoritative sources that support your claims.`;
  },

  "Citation Patterns": static_(
    'Use formal citation patterns (e.g., [1], "according to") when referencing sources.',
  ),

  "Numeric Claims": static_(
    "Include relevant statistics and data points to support your content with verifiable claims.",
  ),

  "Attribution Indicators": static_(
    'Attribute claims to specific sources or experts. Phrases like "according to" help AI engines trace information.',
  ),

  "Quoted Attribution": static_(
    'Add expert quotes with clear attribution. Use patterns like "Quote text" - Expert Name or "Quote text," said Expert Name. Research shows quotation addition increased AI visibility by 30-40%.',
  ),

  "Author Attribution": static_(
    "Add visible author information with a byline to establish who created the content.",
  ),

  "Organization Identity": static_(
    "Add Organization structured data or og:site_name to help engines identify the source.",
  ),

  "Contact/About Links": static_(
    "Link to About and Contact pages to establish credibility and enable source verification.",
  ),

  "Publication Date": static_(
    "Include publication and last-updated dates using proper HTML5 time elements or schema markup.",
  ),

  "Content Freshness": (rawData) => {
    const freshness = rawData.freshness;
    if (!freshness || freshness.ageInMonths === null) {
      return "Add a publication or modified date to your content. 65% of AI crawler hits target content less than 1 year old. Without a parseable date, AI engines may deprioritize your content.";
    }
    const months = Math.round(freshness.ageInMonths);
    if (months > 24) {
      return `Your content was last updated ${months} months ago. AI engines strongly prefer content less than 12 months old. Consider updating with current information and refreshing the modified date.`;
    }
    if (months > 12) {
      return `Your content was last updated ${months} months ago. 65% of AI crawler hits target content less than 1 year old. Refresh your content and update the modified date.`;
    }
    if (!freshness.hasModifiedDate) {
      return `Your content has a publish date but no modified date. Adding a dateModified signal shows active maintenance and gives a freshness boost with AI engines.`;
    }
    return "Update your content to include a recent publication or modified date. Content freshness acts as a hard gate for AI engine citations.";
  },

  "Structured Data": (rawData) => {
    const types = rawData.structuredDataTypes;
    if (!types || types.length === 0) {
      return "Add JSON-LD structured data and Open Graph tags to provide machine-readable context. Start with the schema type that matches your page (Article, Organization, Product, FAQPage, etc.).";
    }
    return `Found ${types.join(", ")} schema${types.length === 1 ? "" : "s"}. Ensure you also have Open Graph tags (og:title, og:description, og:image) and a canonical URL for complete structured data coverage.`;
  },

  "Schema Completeness": (rawData) => {
    const schema = rawData.schemaCompleteness;
    if (!schema || schema.details.length === 0) {
      return "Add JSON-LD schema with all recommended properties. Complete schemas help AI engines attribute and trust your content.";
    }
    const incomplete = schema.details.filter((d) => d.missing.length > 0);
    if (incomplete.length === 0) {
      return "Ensure your JSON-LD schema types include all recommended properties for maximum AI engine trust.";
    }
    const summaries = incomplete.map(
      (d) => `${d.type} is missing ${d.missing.join(", ")}`,
    );
    return `Your ${summaries.join("; ")}. Adding these properties helps AI engines attribute and trust your content.`;
  },

  "Entity Consistency": (rawData) => {
    const ec = rawData.entityConsistency;
    if (!ec || !ec.entityName) {
      return "Add a consistent brand or organization name across your page title, OG tags, JSON-LD schema, and footer. Consistent entity signals help AI engines confidently attribute content to your brand.";
    }
    return `"${ec.entityName}" was found on ${ec.surfacesFound} of ${ec.surfacesChecked} page surfaces. Ensure it appears consistently in the page title, OG tags, schema, and footer for strong brand attribution.`;
  },

  "Sentence Length": (rawData) => {
    const avg = rawData.avgSentenceLength;
    if (avg === undefined) {
      return "Aim for an average sentence length of 12-22 words for optimal readability and compressibility.";
    }
    const rounded = Math.round(avg);
    if (rounded > 22) {
      return `Your average sentence is ${rounded} words. The ideal range for AI compression is 12-22 words. Break long sentences into shorter, more direct statements.`;
    }
    if (rounded < 12) {
      return `Your average sentence is ${rounded} words. While short sentences are readable, combining some into 12-22 word sentences provides better context for AI summarization.`;
    }
    return `Your average sentence length is ${rounded} words. Fine-tune toward the 12-22 word sweet spot for optimal AI compression.`;
  },

  Readability: (rawData) => {
    const score = rawData.readabilityScore;
    if (score === undefined) {
      return "Simplify language where possible. A Flesch Reading Ease score of 60-70 is ideal for broad AI reusability.";
    }
    const rounded = Math.round(score);
    if (rounded < 30) {
      return `Your Flesch Reading Ease score is ${rounded} (very difficult). A score of 60-70 is ideal. Shorten sentences, use simpler vocabulary, and break up complex ideas.`;
    }
    if (rounded < 50) {
      return `Your Flesch Reading Ease score is ${rounded} (difficult). A score of 60-70 is ideal for broad AI reusability. Simplify where possible without losing meaning.`;
    }
    if (rounded < 60) {
      return `Your Flesch Reading Ease score is ${rounded} (fairly difficult). You're close to the ideal 60-70 range. Minor simplification would improve AI compressibility.`;
    }
    return `Your Flesch Reading Ease score is ${rounded}. A score of 60-70 is ideal for broad AI reusability.`;
  },

  "Jargon Density": static_(
    "Define technical terms or replace with simpler alternatives. High jargon density reduces AI reusability.",
  ),

  "Transition Usage": static_(
    "Use transition words (however, therefore, additionally) to improve content flow and logical structure.",
  ),
};
