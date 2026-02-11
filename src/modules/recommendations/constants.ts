export const RECOMMENDATION_MAP: Record<string, string> = {
  // Content Extractability
  'Fetch Success': 'Ensure the page returns HTTP 200 without excessive redirect chains. Generative engines cannot extract content from pages that fail to load.',
  'Text Extraction Quality': 'Improve the ratio of meaningful text content to markup. Pages with very low text density are harder for generative engines to extract useful content from.',
  'Boilerplate Ratio': 'Reduce boilerplate content (navigation, footers, sidebars) relative to main content. Use semantic HTML elements like <main> and <article> to help engines isolate your content.',
  'Word Count Adequacy': 'Ensure the page has sufficient content (300-3000 words) to provide comprehensive coverage. Thin content is less useful for generative engines to reference.',
  'AI Crawler Access': 'Your robots.txt is blocking AI crawlers. Ensure GPTBot, ClaudeBot, PerplexityBot, and Google-Extended are allowed. Blocking these crawlers means your content cannot be discovered or cited by generative engines.',
  'LLMs.txt Presence': 'Consider adding llms.txt and llms-full.txt files at your domain root. This emerging standard provides AI systems with a structured overview of your site, helping them understand and reference your content more effectively.',

  // Content Structure for Reuse
  'Heading Hierarchy': 'Use a clear H1 > H2 > H3 heading hierarchy. Headings serve as structural anchors that generative engines use to segment and reuse content.',
  'Lists Presence': 'Add bulleted or numbered lists to organize information. Lists are easily extracted and reused by generative engines.',
  'Tables Presence': 'Consider adding data tables for comparative or structured data. Tables are highly parseable by generative engines.',
  'Paragraph Structure': 'Keep paragraphs between 30-150 words for optimal readability and extractability.',
  'Scannability': 'Use bold text, short paragraphs, and frequent headings to improve scannability for both humans and AI.',
  'Section Length': 'Aim for 120-180 words between headings. Pages with this section length receive 70% more AI citations. Each headed section should be a complete, self-contained unit of information that a generative engine could extract and reuse.',

  // Answerability
  'Definition Patterns': 'Define key terms and concepts clearly (e.g., "X is defined as..." or "X refers to..."). Clear definitions are directly reusable by generative engines.',
  'Direct Answer Statements': 'Start key sentences with direct statements that could serve as standalone answers.',
  'Answer Capsules': 'Place a concise answer (under 200 characters) immediately after each question-framed H2. 72% of AI-cited content uses this "answer capsule" pattern. Put the direct answer in the first sentence, then elaborate below.',
  'Step-by-Step Content': 'Break down processes into clear, numbered steps. Step-by-step content is highly reusable by generative engines.',
  'Q/A Patterns': 'Include and answer common questions your audience might have. Structure content to directly answer "what is", "how to" style queries.',
  'Summary/Conclusion': 'Add a conclusion section with key takeaways or a summary. This helps generative engines quickly extract the main points.',

  // Entity Clarity
  'Entity Richness': 'Reference relevant experts, organizations, and places in your field. Named entities help generative engines understand context.',
  'Topic Consistency': 'Align your main topics with your title and headings. Topic consistency helps generative engines understand what your page is about.',
  'Entity Density': 'Ensure a balanced density of named entities (2-8 per 100 words). Too few makes content vague; too many makes it hard to parse.',

  // Grounding Signals
  'External References': 'Cite reputable external sources to ground your claims. Generative engines use these to verify and attribute information.',
  'Citation Patterns': 'Use formal citation patterns (e.g., [1], "according to") when referencing sources.',
  'Numeric Claims': 'Include relevant statistics and data points to support your content with verifiable claims.',
  'Attribution Indicators': 'Attribute claims to specific sources or experts. Phrases like "according to" help generative engines trace information.',
  'Quoted Attribution': 'Add expert quotes with clear attribution. Use patterns like "Quote text" - Expert Name or "Quote text," said Expert Name. The Princeton GEO study found quotation addition increased generative visibility by 30-40%.',

  // Authority Context
  'Author Attribution': 'Add visible author information with a byline to establish who created the content.',
  'Organization Identity': 'Add Organization structured data or og:site_name to help engines identify the source.',
  'Contact/About Links': 'Link to About and Contact pages to establish credibility and enable source verification.',
  'Publication Date': 'Include publication and last-updated dates using proper HTML5 time elements or schema markup.',
  'Content Freshness': 'Update your content to include a recent publication or modified date. 65% of AI crawler hits target content less than 1 year old. Content freshness acts as a hard gate for generative engine citations - stale content loses visibility regardless of quality.',
  'Structured Data': 'Implement JSON-LD structured data and Open Graph tags to provide machine-readable context about your content.',

  // Readability for Compression
  'Sentence Length': 'Aim for an average sentence length of 12-22 words for optimal readability and compressibility.',
  'Readability': 'Simplify language where possible. A Flesch Reading Ease score of 60-70 is ideal for broad generative reusability.',
  'Jargon Density': 'Define technical terms or replace with simpler alternatives. High jargon density reduces generative reusability.',
  'Transition Usage': 'Use transition words (however, therefore, additionally) to improve content flow and logical structure.',
};
