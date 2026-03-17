export const listsConversionExample = `<!-- Before: prose enumeration -->
<p>We offer design, development, and strategy services.</p>

<!-- After: unordered list -->
<ul>
  <li>Design — UI/UX and brand identity</li>
  <li>Development — web and mobile engineering</li>
  <li>Strategy — AI readiness and growth planning</li>
</ul>

<!-- Ordered list for sequential steps -->
<ol>
  <li>Submit your project brief</li>
  <li>Schedule a discovery call</li>
  <li>Receive your proposal within 48 hours</li>
</ol>`;

export const tablesMarkupExample = `<table>
  <caption>Plan feature comparison</caption>
  <thead>
    <tr>
      <th>Feature</th>
      <th>Starter</th>
      <th>Pro</th>
      <th>Enterprise</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Users</td>
      <td>1</td>
      <td>10</td>
      <td>Unlimited</td>
    </tr>
    <tr>
      <td>Storage</td>
      <td>10 GB</td>
      <td>100 GB</td>
      <td>1 TB</td>
    </tr>
  </tbody>
</table>`;

export const directAnswerExample = `<!-- Before: buried answer -->
<p>There are many factors involved, and while it depends on the situation,
in most cases companies that invest in AI SEO tend to see better visibility
in AI-generated answers.</p>

<!-- After: direct answer first -->
<p>Companies that invest in AI SEO see better visibility in AI-generated answers.
Results depend on content quality, structured data completeness, and how well
headings are framed as questions.</p>`;

export const summaryStructureExample = `<h2>Key Takeaways</h2>
<ul>
  <li>AI SEO focuses on being cited in generated answers, not ranked in link lists.</li>
  <li>Structured data, answer capsules, and clear entity attribution are the highest-impact factors.</li>
  <li>Content freshness acts as a hard gate — AI engines strongly prefer content under 12 months old.</li>
</ul>

<h2>Next Steps</h2>
<p>Run an audit on your top pages to identify your highest-priority improvements.</p>`;

export const attributionIndicatorExample = `<!-- Before: unattributed claim -->
<p>72% of AI-cited content uses question-framed headings.</p>

<!-- After: attributed with a link -->
<p>According to <a href="https://arxiv.org/abs/2311.09735">Princeton's GEO research</a>,
72% of AI-cited content uses question-framed headings.</p>`;

export const citationMarkupExample = `<!-- In-text citation with marker -->
<p>AI engines prioritize structured content by a factor of 3x <a href="#ref-1">[1]</a>.</p>

<!-- Cited title -->
<p>As described in <cite>Generative Engine Optimization</cite>, answer density is key.</p>

<!-- References section -->
<section>
  <h2>References</h2>
  <ol>
    <li id="ref-1">
      <cite><a href="https://arxiv.org/abs/2311.09735">Generative Engine Optimization (GEO)</a></cite>
      — Aggarwal et al., Princeton University, 2023
    </li>
  </ol>
</section>`;

export const blockquoteAttributionExample = `<blockquote>
  <p>"Structured content with clear attribution is 3x more likely to be cited
  by generative AI engines than unstructured prose."</p>
  <footer>
    — <cite>Dr. Jane Smith, AI Research Lead,
    <a href="https://example.edu">Princeton University</a></cite>
  </footer>
</blockquote>`;

export const transitionWordsExample = `<!-- Before: abrupt transitions -->
<p>AI engines extract structured content. Many pages have no structure.</p>
<p>Adding headings and lists improves your score.</p>

<!-- After: logical flow with transitions -->
<p>AI engines extract structured content. <strong>However</strong>, many pages
lack the organization needed for reliable extraction.</p>
<p><strong>Therefore</strong>, adding headings and lists directly improves
how AI engines process and cite your content.</p>`;

export const jargonReductionExample = `<!-- Before: jargon-heavy -->
<p>Our RAG-based LLM pipeline leverages semantic chunking and vector embeddings
to optimize retrieval latency for enterprise-scale deployments.</p>

<!-- After: jargon defined on first use -->
<p>Our AI pipeline uses Retrieval-Augmented Generation (RAG) — a technique that
combines a language model with a searchable knowledge base — to deliver fast,
accurate answers at enterprise scale.</p>`;

export const contactLinksExample = `<!-- In site navigation or footer -->
<nav aria-label="Company">
  <a href="/about">About Us</a>
  <a href="/contact">Contact</a>
</nav>

<!-- Optional: contactPoint in your Organization JSON-LD -->
"contactPoint": {
  "@type": "ContactPoint",
  "contactType": "customer support",
  "url": "https://yoursite.com/contact"
}`;

export const imageAltTextExample = `<!-- Informational image with alt text -->
<img src="diagram.png" alt="Flowchart showing the three stages of AI content extraction">

<!-- Image with caption using figure/figcaption -->
<figure>
  <img src="chart.png" alt="Bar chart comparing AI citation rates by content type">
  <figcaption>AI engines cite structured content 3x more often than unstructured prose.</figcaption>
</figure>

<!-- Decorative image — empty alt tells screen readers to skip it -->
<img src="divider.png" alt="">`;

export const answerCapsuleExample = `<!-- Before -->
<h2>Benefits of AI SEO</h2>
<p>There are many reasons companies are investing in AI SEO strategies today...</p>

<!-- After (answer capsule pattern) -->
<h2>What are the benefits of AI SEO?</h2>
<p>AI SEO increases your content's visibility in AI-generated answers, driving qualified traffic from ChatGPT, Claude, and Perplexity.</p>
<p>Companies investing in AI SEO see benefits across three areas...</p>`;
