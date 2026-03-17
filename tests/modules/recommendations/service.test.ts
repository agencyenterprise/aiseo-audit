import { describe, expect, it } from "vitest";
import type {
  AuditRawDataType,
  AuditResultType,
  CategoryNameType,
  CategoryResultType,
  FactorResultType,
} from "../../../src/modules/audits/schema.js";
import { generateRecommendations } from "../../../src/modules/recommendations/service.js";

function makeFactor(
  name: string,
  score: number,
  maxScore: number,
): FactorResultType {
  return {
    name,
    score,
    maxScore,
    value: `${score}/${maxScore}`,
    status: score / maxScore >= 0.7 ? "good" : "needs_improvement",
  };
}

function makeCategory(
  name: string,
  key: CategoryNameType,
  factors: FactorResultType[],
): CategoryResultType {
  const score = factors.reduce((sum, f) => sum + f.score, 0);
  const maxScore = factors.reduce((sum, f) => sum + f.maxScore, 0);
  return { name, key, score, maxScore, factors };
}

const DEFAULT_RAW_DATA: AuditRawDataType = {
  title: "Test",
  metaDescription: "",
  wordCount: 500,
};

function makeAuditResult(
  categories: Record<string, CategoryResultType>,
  rawData?: Partial<AuditRawDataType>,
): AuditResultType {
  return {
    categories: categories as Record<CategoryNameType, CategoryResultType>,
    rawData: { ...DEFAULT_RAW_DATA, ...rawData },
  };
}

describe("generateRecommendations", () => {
  it("generates no recommendations for perfect scores", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 100, 100),
        makeFactor("Headings", 80, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs.length).toBe(0);
  });

  it("generates recommendations for low scores", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 20, 100),
        makeFactor("Headings", 50, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs.length).toBe(2);
  });

  it("assigns high priority for <30%", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 10, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].priority).toBe("high");
  });

  it("assigns medium priority for 30-49%", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 40, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].priority).toBe("medium");
  });

  it("assigns low priority for 50-69%", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 60, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].priority).toBe("low");
  });

  it("sorts recommendations by priority then by name", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Zebra Factor", 60, 100),
        makeFactor("Alpha Factor", 10, 100),
        makeFactor("Beta Factor", 40, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].factor).toBe("Alpha Factor");
    expect(recs[0].priority).toBe("high");
    expect(recs[1].factor).toBe("Beta Factor");
    expect(recs[1].priority).toBe("medium");
    expect(recs[2].factor).toBe("Zebra Factor");
    expect(recs[2].priority).toBe("low");
  });

  it("includes category name in recommendation", () => {
    const auditResult = makeAuditResult({
      authority: makeCategory("Authority Context", "authorityContext", [
        makeFactor("Author Attribution", 0, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].category).toBe("Authority Context");
  });

  it("includes current value in recommendation", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 50, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].currentValue).toBe("50/100");
  });

  it("handles multiple categories", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 30, 100),
      ]),
      authority: makeCategory("Authority", "authorityContext", [
        makeFactor("Author", 10, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs.length).toBe(2);
    const categories = recs.map((r) => r.category);
    expect(categories).toContain("Content");
    expect(categories).toContain("Authority");
  });

  it("handles empty audit result", () => {
    const auditResult = makeAuditResult({});

    const recs = generateRecommendations(auditResult);

    expect(recs.length).toBe(0);
  });

  it("skips factors at exactly 70%", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Word Count", 70, 100),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs.length).toBe(0);
  });
});

describe("context-aware recommendations", () => {
  it("includes actual word count in Word Count Adequacy", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("Word Count Adequacy", 2, 12),
        ]),
      },
      { wordCount: 87 },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("87 words");
  });

  it("names blocked crawlers in AI Crawler Access", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("AI Crawler Access", 3, 10),
        ]),
      },
      {
        crawlerAccess: {
          blocked: ["GPTBot", "ClaudeBot"],
          allowed: ["PerplexityBot"],
          unknown: [],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("GPTBot");
    expect(recs[0].recommendation).toContain("ClaudeBot");
    expect(recs[0].recommendation).toContain("PerplexityBot");
  });

  it("includes image counts in Image Accessibility", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("Image Accessibility", 3, 8),
        ]),
      },
      {
        imageAccessibility: {
          imageCount: 12,
          imagesWithAlt: 3,
          figcaptionCount: 0,
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("3 of your 12 images");
    expect(recs[0].recommendation).toContain("25%");
  });

  it("includes section length average in Section Length", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentStructure", [
          makeFactor("Section Length", 4, 12),
        ]),
      },
      {
        sectionLengths: {
          sectionCount: 5,
          avgWordsPerSection: 312,
          sections: [250, 300, 350, 280, 380],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("312 words");
    expect(recs[0].recommendation).toContain("120-180");
  });

  it("includes capsule counts in Answer Capsules", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "answerability", [
          makeFactor("Answer Capsules", 2, 13),
        ]),
      },
      {
        answerCapsules: { total: 5, withCapsule: 1 },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("1 of your 5");
    expect(recs[0].recommendation).toContain("remaining 4");
  });

  it("includes freshness age in Content Freshness", () => {
    const auditResult = makeAuditResult(
      {
        authority: makeCategory("Authority", "authorityContext", [
          makeFactor("Content Freshness", 2, 12),
        ]),
      },
      {
        freshness: {
          publishDate: "2024-01-01",
          modifiedDate: null,
          ageInMonths: 25,
          hasModifiedDate: false,
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("25 months");
  });

  it("lists missing schema properties in Schema Completeness", () => {
    const auditResult = makeAuditResult(
      {
        authority: makeCategory("Authority", "authorityContext", [
          makeFactor("Schema Completeness", 4, 10),
        ]),
      },
      {
        schemaCompleteness: {
          totalTypes: 1,
          avgCompleteness: 0.33,
          details: [
            {
              type: "Article",
              present: ["headline"],
              missing: ["author", "datePublished"],
            },
          ],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("Article");
    expect(recs[0].recommendation).toContain("author");
    expect(recs[0].recommendation).toContain("datePublished");
  });

  it("includes sentence length average", () => {
    const auditResult = makeAuditResult(
      {
        readability: makeCategory("Readability", "readabilityForCompression", [
          makeFactor("Sentence Length", 5, 15),
        ]),
      },
      { avgSentenceLength: 34 },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("34 words");
    expect(recs[0].recommendation).toContain("12-22");
  });

  it("includes Flesch score in Readability", () => {
    const auditResult = makeAuditResult(
      {
        readability: makeCategory("Readability", "readabilityForCompression", [
          makeFactor("Readability", 6, 15),
        ]),
      },
      { readabilityScore: 38 },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("38");
    expect(recs[0].recommendation).toContain("difficult");
  });

  it("includes entity name in Entity Consistency", () => {
    const auditResult = makeAuditResult(
      {
        authority: makeCategory("Authority", "authorityContext", [
          makeFactor("Entity Consistency", 2, 10),
        ]),
      },
      {
        entityConsistency: {
          entityName: "Acme Corp",
          surfacesFound: 1,
          surfacesChecked: 4,
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("Acme Corp");
    expect(recs[0].recommendation).toContain("1 of 4");
  });

  it("includes entity breakdown in Entity Richness", () => {
    const auditResult = makeAuditResult(
      {
        entity: makeCategory("Entity", "entityClarity", [
          makeFactor("Entity Richness", 7, 20),
        ]),
      },
      {
        entities: {
          people: ["John"],
          organizations: ["Acme"],
          places: [],
          topics: ["SEO", "AI"],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("4 unique entities");
    expect(recs[0].recommendation).toContain("1 people");
    expect(recs[0].recommendation).toContain("1 organizations");
    expect(recs[0].recommendation).toContain("2 topics");
  });

  it("includes external link count in External References", () => {
    const auditResult = makeAuditResult(
      {
        grounding: makeCategory("Grounding", "groundingSignals", [
          makeFactor("External References", 6, 13),
        ]),
      },
      {
        externalLinks: [
          { url: "https://example.com", text: "Example" },
          { url: "https://other.com", text: "Other" },
        ],
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("2 external links");
  });

  it("tells user to add both files when neither llms.txt file exists", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("LLMs.txt Presence", 0, 6),
        ]),
      },
      {
        llmsTxt: { llmsTxtExists: false, llmsFullTxtExists: false },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("llms.txt");
    expect(recs[0].recommendation).toContain("llms-full.txt");
  });

  it("tells user to add llms-full.txt when only llms.txt exists", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("LLMs.txt Presence", 4, 6),
        ]),
      },
      {
        llmsTxt: { llmsTxtExists: true, llmsFullTxtExists: false },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("llms-full.txt");
    expect(recs[0].recommendation).not.toContain("missing llms.txt");
  });

  it("tells user to add llms.txt when only llms-full.txt exists", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("LLMs.txt Presence", 4, 6),
        ]),
      },
      {
        llmsTxt: { llmsTxtExists: false, llmsFullTxtExists: true },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("llms.txt");
    expect(recs[0].recommendation).not.toContain("missing llms-full.txt");
  });

  it("falls back gracefully when rawData field is missing", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("AI Crawler Access", 0, 10),
        ]),
      },
      {},
    );

    const recs = generateRecommendations(auditResult);

    expect(recs.length).toBe(1);
    expect(recs[0].recommendation).toBeTruthy();
  });
});

describe("actionable recommendation fields", () => {
  it("includes steps for Structured Data when no schema found", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("Structured Data", 0, 10),
        ]),
      },
      { title: "My Blog Post", metaDescription: "A great post" },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].steps!.length).toBeGreaterThan(0);
  });

  it("includes codeExample for Structured Data when no schema found", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("Structured Data", 0, 10),
        ]),
      },
      { title: "My Blog Post", metaDescription: "A great post" },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].codeExample).toBeDefined();
    expect(recs[0].codeExample).toContain("application/ld+json");
    expect(recs[0].codeExample).toContain("My Blog Post");
  });

  it("includes learnMoreUrl for Structured Data", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentExtractability", [
        makeFactor("Structured Data", 0, 10),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].learnMoreUrl).toBe("https://schema.org/docs/gs.html");
  });

  it("generates FAQPage JSON-LD when questions are found", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("Structured Data", 0, 10),
        ]),
      },
      { questionsFound: ["What is AI SEO?", "How does it work?"] },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].codeExample).toContain("FAQPage");
    expect(recs[0].codeExample).toContain("What is AI SEO?");
  });

  it("generates robots.txt Allow rules in AI Crawler Access codeExample", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("AI Crawler Access", 0, 10),
        ]),
      },
      {
        crawlerAccess: {
          blocked: ["GPTBot", "ClaudeBot"],
          allowed: [],
          unknown: [],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].codeExample).toContain("GPTBot");
    expect(recs[0].codeExample).toContain("Allow: /");
    expect(recs[0].steps).toBeDefined();
    expect(recs[0].learnMoreUrl).toBeDefined();
  });

  it("includes steps and codeExample for Answer Capsules", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "answerability", [
        makeFactor("Answer Capsules", 0, 13),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("<h2>");
  });

  it("includes codeExample and learnMoreUrl for LLMs.txt Presence", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentExtractability", [
          makeFactor("LLMs.txt Presence", 0, 6),
        ]),
      },
      {
        llmsTxt: { llmsTxtExists: false, llmsFullTxtExists: false },
        title: "My Site",
        metaDescription: "Great site",
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].codeExample).toBeDefined();
    expect(recs[0].learnMoreUrl).toBe("https://llmstxt.org");
  });

  it("includes steps and codeExample for Author Attribution", () => {
    const auditResult = makeAuditResult({
      authority: makeCategory("Authority", "authorityContext", [
        makeFactor("Author Attribution", 0, 10),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("byline");
    expect(recs[0].learnMoreUrl).toBeDefined();
  });

  it("includes steps and codeExample for Heading Hierarchy", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory("Content", "contentStructure", [
          makeFactor("Heading Hierarchy", 0, 10),
        ]),
      },
      { title: "AI SEO Guide" },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("<h1>");
  });

  it("includes codeExample and steps for Content Freshness", () => {
    const auditResult = makeAuditResult(
      {
        authority: makeCategory("Authority", "authorityContext", [
          makeFactor("Content Freshness", 0, 12),
        ]),
      },
      {
        freshness: {
          publishDate: "2023-01-01",
          modifiedDate: null,
          ageInMonths: 38,
          hasModifiedDate: false,
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].codeExample).toContain("dateModified");
    expect(recs[0].steps).toBeDefined();
  });

  it("includes steps and codeExample for Schema Completeness when properties missing", () => {
    const auditResult = makeAuditResult(
      {
        authority: makeCategory("Authority", "authorityContext", [
          makeFactor("Schema Completeness", 2, 10),
        ]),
      },
      {
        schemaCompleteness: {
          totalTypes: 1,
          avgCompleteness: 0.33,
          details: [
            {
              type: "Article",
              present: ["headline"],
              missing: ["author", "datePublished"],
            },
          ],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("author");
    expect(recs[0].learnMoreUrl).toContain("schema.org/Article");
  });

  it("does not include steps or codeExample for plain constant builders", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content", "contentStructure", [
        makeFactor("Paragraph Structure", 0, 10),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeUndefined();
    expect(recs[0].codeExample).toBeUndefined();
    expect(recs[0].learnMoreUrl).toBeUndefined();
  });

  it("includes steps and codeExample for Lists Presence", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content Structure for Reuse", "contentStructure", [
        makeFactor("Lists Presence", 0, 11),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].steps!.length).toBeGreaterThan(0);
    expect(recs[0].codeExample).toContain("<ul>");
  });

  it("includes steps and codeExample for Tables Presence", () => {
    const auditResult = makeAuditResult({
      content: makeCategory("Content Structure for Reuse", "contentStructure", [
        makeFactor("Tables Presence", 0, 8),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("<table>");
  });

  it("includes steps and codeExample for Definition Patterns", () => {
    const auditResult = makeAuditResult({
      answerability: makeCategory("Answerability", "answerability", [
        makeFactor("Definition Patterns", 0, 10),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("is defined as");
  });

  it("includes steps and codeExample for Direct Answer Statements", () => {
    const auditResult = makeAuditResult({
      answerability: makeCategory("Answerability", "answerability", [
        makeFactor("Direct Answer Statements", 0, 11),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toBeDefined();
  });

  it("includes steps and codeExample for Summary/Conclusion", () => {
    const auditResult = makeAuditResult({
      answerability: makeCategory("Answerability", "answerability", [
        makeFactor("Summary/Conclusion", 0, 9),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("<h2>");
  });

  it("includes steps and codeExample for Attribution Indicators", () => {
    const auditResult = makeAuditResult({
      grounding: makeCategory("Grounding Signals", "groundingSignals", [
        makeFactor("Attribution Indicators", 0, 11),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("According to");
  });

  it("includes steps and codeExample for Citation Patterns", () => {
    const auditResult = makeAuditResult({
      grounding: makeCategory("Grounding Signals", "groundingSignals", [
        makeFactor("Citation Patterns", 0, 13),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("<cite>");
  });

  it("includes steps and codeExample for Quoted Attribution", () => {
    const auditResult = makeAuditResult({
      grounding: makeCategory("Grounding Signals", "groundingSignals", [
        makeFactor("Quoted Attribution", 0, 10),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("<blockquote>");
  });

  it("includes steps and codeExample for Transition Usage", () => {
    const auditResult = makeAuditResult({
      readability: makeCategory(
        "Readability for Compression",
        "readabilityForCompression",
        [makeFactor("Transition Usage", 0, 15)],
      ),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toBeDefined();
  });

  it("includes steps and codeExample for Jargon Density", () => {
    const auditResult = makeAuditResult({
      readability: makeCategory(
        "Readability for Compression",
        "readabilityForCompression",
        [makeFactor("Jargon Density", 0, 15)],
      ),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toBeDefined();
  });

  it("includes steps and codeExample for Organization Identity", () => {
    const auditResult = makeAuditResult({
      authority: makeCategory("Authority Context", "authorityContext", [
        makeFactor("Organization Identity", 0, 10),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("Organization");
    expect(recs[0].learnMoreUrl).toContain("schema.org");
  });

  it("uses detected organization name in Organization Identity codeExample", () => {
    const auditResult = makeAuditResult(
      {
        authority: makeCategory("Authority Context", "authorityContext", [
          makeFactor("Organization Identity", 0, 10),
        ]),
      },
      {
        entities: {
          people: [],
          organizations: ["Acme Corp"],
          places: [],
          topics: [],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].codeExample).toContain("Acme Corp");
  });

  it("includes steps and codeExample for Publication Date", () => {
    const auditResult = makeAuditResult({
      authority: makeCategory("Authority Context", "authorityContext", [
        makeFactor("Publication Date", 0, 8),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("datePublished");
    expect(recs[0].learnMoreUrl).toBeDefined();
  });

  it("includes steps and codeExample for Contact/About Links", () => {
    const auditResult = makeAuditResult({
      authority: makeCategory("Authority Context", "authorityContext", [
        makeFactor("Contact/About Links", 0, 10),
      ]),
    });

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("About");
  });

  it("includes steps and codeExample for External References when no links exist", () => {
    const auditResult = makeAuditResult(
      {
        grounding: makeCategory("Grounding Signals", "groundingSignals", [
          makeFactor("External References", 0, 13),
        ]),
      },
      { externalLinks: [] },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toBeDefined();
  });

  it("includes steps and codeExample for External References when too few links exist", () => {
    const auditResult = makeAuditResult(
      {
        grounding: makeCategory("Grounding Signals", "groundingSignals", [
          makeFactor("External References", 6, 13),
        ]),
      },
      {
        externalLinks: [
          { url: "https://example.com", text: "Example" },
          { url: "https://other.com", text: "Other" },
        ],
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toBeDefined();
  });

  it("includes steps for Entity Richness when no entities are detected", () => {
    const auditResult = makeAuditResult(
      {
        entity: makeCategory("Entity Clarity", "entityClarity", [
          makeFactor("Entity Richness", 0, 20),
        ]),
      },
      { entities: { people: [], organizations: [], places: [], topics: [] } },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
  });

  it("includes steps for Entity Richness when entity count is below threshold", () => {
    const auditResult = makeAuditResult(
      {
        entity: makeCategory("Entity Clarity", "entityClarity", [
          makeFactor("Entity Richness", 7, 20),
        ]),
      },
      {
        entities: {
          people: ["Alice"],
          organizations: ["Acme"],
          places: [],
          topics: ["SEO"],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
  });

  it("gives in-range message for Sentence Length when average is 12–22 words", () => {
    const auditResult = makeAuditResult(
      {
        readability: makeCategory("Readability", "readabilityForCompression", [
          makeFactor("Sentence Length", 10, 15),
        ]),
      },
      { avgSentenceLength: 17 },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("17 words");
    expect(recs[0].recommendation).toContain("12-22");
  });

  it("gives short-sentence message for Sentence Length when average is under 12 words", () => {
    const auditResult = makeAuditResult(
      {
        readability: makeCategory("Readability", "readabilityForCompression", [
          makeFactor("Sentence Length", 10, 15),
        ]),
      },
      { avgSentenceLength: 8 },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("8 words");
    expect(recs[0].recommendation).toContain("short");
  });

  it("gives fallback message for Readability when score is undefined", () => {
    const auditResult = makeAuditResult(
      {
        readability: makeCategory("Readability", "readabilityForCompression", [
          makeFactor("Readability", 6, 15),
        ]),
      },
      {},
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("60-70");
  });

  it("gives fairly difficult message for Readability when score is 50–59", () => {
    const auditResult = makeAuditResult(
      {
        readability: makeCategory("Readability", "readabilityForCompression", [
          makeFactor("Readability", 10, 15),
        ]),
      },
      { readabilityScore: 55 },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("55");
    expect(recs[0].recommendation).toContain("fairly difficult");
  });

  it("gives general message for Readability when score is 60 or above", () => {
    const auditResult = makeAuditResult(
      {
        readability: makeCategory("Readability", "readabilityForCompression", [
          makeFactor("Readability", 10, 15),
        ]),
      },
      { readabilityScore: 65 },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].recommendation).toContain("65");
    expect(recs[0].recommendation).toContain("60-70");
  });

  it("uses detected topic in Definition Patterns codeExample when topic is available", () => {
    const auditResult = makeAuditResult(
      {
        answerability: makeCategory("Answerability", "answerability", [
          makeFactor("Definition Patterns", 0, 10),
        ]),
      },
      {
        entities: {
          people: [],
          organizations: [],
          places: [],
          topics: ["Content Marketing"],
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].codeExample).toContain("Content Marketing");
    expect(recs[0].codeExample).toContain("is defined as");
  });

  it("uses detected question in Answer Capsules codeExample when question is available", () => {
    const auditResult = makeAuditResult(
      {
        answerability: makeCategory("Answerability", "answerability", [
          makeFactor("Answer Capsules", 0, 13),
        ]),
      },
      {
        questionsFound: ["What is content marketing?"],
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].codeExample).toContain("What is content marketing?");
  });

  it("uses first existing link in External References codeExample when links are present", () => {
    const auditResult = makeAuditResult(
      {
        grounding: makeCategory("Grounding Signals", "groundingSignals", [
          makeFactor("External References", 6, 13),
        ]),
      },
      {
        externalLinks: [
          { url: "https://research.example.com/study", text: "Research Study" },
        ],
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].codeExample).toContain("https://research.example.com/study");
    expect(recs[0].codeExample).toContain("Research Study");
  });

  it("includes steps and codeExample for Image Accessibility when images lack alt text", () => {
    const auditResult = makeAuditResult(
      {
        content: makeCategory(
          "Content Extractability",
          "contentExtractability",
          [makeFactor("Image Accessibility", 3, 8)],
        ),
      },
      {
        imageAccessibility: {
          imageCount: 6,
          imagesWithAlt: 2,
          figcaptionCount: 0,
        },
      },
    );

    const recs = generateRecommendations(auditResult);

    expect(recs[0].steps).toBeDefined();
    expect(recs[0].codeExample).toContain("alt=");
  });
});
