import { countWords } from "../../utils/strings.js";
import { getDomain } from "../../utils/url.js";
import type { ExtractedPage } from "../extractor/schema.js";
import type { FetchResult } from "../fetcher/schema.js";
import { CATEGORY_DISPLAY_NAMES } from "./constants.js";
import type {
  AuditResultType,
  CategoryAuditOutput,
  DomainSignalsType,
  FactorResultType,
} from "./schema.js";
import {
  avgSentenceLength,
  checkCrawlerAccess,
  computeFleschReadingEase,
  countComplexWords,
  countPatternMatches,
  countTransitionWords,
  detectAnswerCapsules,
  evaluateFreshness,
  evaluateSchemaCompleteness,
  extractEntities,
  measureEntityConsistency,
  measureSectionLengths,
  parseJsonLdObjects,
  resolveEntityName,
} from "./support/language.js";
import {
  ATTRIBUTION_PATTERNS,
  AUTHOR_SELECTORS,
  CITATION_PATTERNS,
  DATE_SELECTORS,
  DEFINITION_PATTERNS,
  DIRECT_ANSWER_PATTERNS,
  NUMERIC_CLAIM_PATTERNS,
  QUESTION_PATTERNS,
  QUOTED_ATTRIBUTION_PATTERNS,
  STEP_PATTERNS,
  SUMMARY_MARKERS,
  TRANSITION_WORDS,
} from "./support/patterns.js";
import {
  makeFactor,
  maxFactors,
  sumFactors,
  thresholdScore,
} from "./support/scoring.js";

export function runAudits(
  page: ExtractedPage,
  fetchResult: FetchResult,
  domainSignals?: DomainSignalsType,
): AuditResultType {
  const extractability = auditContentExtractability(
    page,
    fetchResult,
    domainSignals,
  );
  const structure = auditContentStructure(page);
  const answerability = auditAnswerability(page);
  const entityClarity = auditEntityClarity(page);
  const groundingSignals = auditGroundingSignals(page);
  const authorityContext = auditAuthorityContext(page);
  const readability = auditReadabilityForCompression(page);

  return {
    categories: {
      contentExtractability: extractability.category,
      contentStructure: structure.category,
      answerability: answerability.category,
      entityClarity: entityClarity.category,
      groundingSignals: groundingSignals.category,
      authorityContext: authorityContext.category,
      readabilityForCompression: readability.category,
    },
    rawData: {
      title: page.title,
      metaDescription: page.metaDescription,
      wordCount: page.stats.wordCount,
      ...extractability.rawData,
      ...structure.rawData,
      ...answerability.rawData,
      ...entityClarity.rawData,
      ...groundingSignals.rawData,
      ...authorityContext.rawData,
      ...readability.rawData,
    },
  };
}

function auditContentExtractability(
  page: ExtractedPage,
  fetchResult: FetchResult,
  domainSignals?: DomainSignalsType,
): CategoryAuditOutput {
  const factors: FactorResultType[] = [];
  const rawData: CategoryAuditOutput["rawData"] = {};

  const fetchScore =
    fetchResult.statusCode === 200 ? 12 : fetchResult.statusCode < 400 ? 8 : 0;
  factors.push(
    makeFactor(
      "Fetch Success",
      fetchScore,
      12,
      `HTTP ${fetchResult.statusCode} in ${fetchResult.fetchTimeMs}ms`,
    ),
  );

  const extractRatio =
    page.stats.rawByteLength > 0
      ? page.stats.cleanTextLength / page.stats.rawByteLength
      : 0;
  const extractScore =
    extractRatio >= 0.05 && extractRatio <= 0.15
      ? 12
      : extractRatio >= 0.01
        ? 8
        : extractRatio > 0.15
          ? 10
          : 2;
  factors.push(
    makeFactor(
      "Text Extraction Quality",
      extractScore,
      12,
      `${(extractRatio * 100).toFixed(1)}% content ratio`,
    ),
  );

  const bpRatio = page.stats.boilerplateRatio;
  const bpScore = thresholdScore(1 - bpRatio, [
    [0.7, 12],
    [0.5, 9],
    [0.3, 6],
    [0, 2],
  ]);
  factors.push(
    makeFactor(
      "Boilerplate Ratio",
      bpScore,
      12,
      `${(bpRatio * 100).toFixed(0)}% boilerplate`,
    ),
  );

  const wc = page.stats.wordCount;
  const wcScore =
    wc >= 300 && wc <= 3000 ? 12 : wc >= 100 ? 8 : wc > 3000 ? 10 : 2;
  factors.push(makeFactor("Word Count Adequacy", wcScore, 12, `${wc} words`));

  if (domainSignals) {
    const access = checkCrawlerAccess(domainSignals.robotsTxt);
    const blockedCount = access.blocked.length;
    const crawlerScore =
      blockedCount === 0
        ? 10
        : blockedCount <= 2
          ? 6
          : blockedCount <= 4
            ? 3
            : 0;
    factors.push(
      makeFactor(
        "AI Crawler Access",
        crawlerScore,
        10,
        blockedCount === 0
          ? `All major AI crawlers allowed`
          : `${access.blocked.join(", ")} blocked in robots.txt`,
      ),
    );

    rawData.crawlerAccess = access;

    const hasLlms = domainSignals.llmsTxtExists;
    const hasLlmsFull = domainSignals.llmsFullTxtExists;
    const llmsScore =
      hasLlms && hasLlmsFull ? 6 : hasLlms || hasLlmsFull ? 4 : 0;
    factors.push(
      makeFactor(
        "LLMs.txt Presence",
        llmsScore,
        6,
        hasLlms && hasLlmsFull
          ? "llms.txt + llms-full.txt found"
          : hasLlms
            ? "llms.txt found"
            : hasLlmsFull
              ? "llms-full.txt found"
              : "Not found",
        !hasLlms && !hasLlmsFull ? "neutral" : undefined,
      ),
    );
  }

  const imageCount = page.stats.imageCount;
  const imagesWithAlt = page.stats.imagesWithAlt;
  const figcaptionCount = page.$("figure figcaption").length;
  const altRatio = imageCount > 0 ? imagesWithAlt / imageCount : 0;

  let imageAccessibilityScore = 0;
  if (imageCount > 0) {
    if (altRatio >= 0.9) imageAccessibilityScore += 5;
    else if (altRatio >= 0.5) imageAccessibilityScore += 3;
    else imageAccessibilityScore += 1;
    if (figcaptionCount > 0) imageAccessibilityScore += 3;
  }

  factors.push(
    makeFactor(
      "Image Accessibility",
      imageAccessibilityScore,
      8,
      imageCount > 0
        ? `${imagesWithAlt}/${imageCount} images have alt text${figcaptionCount > 0 ? `, ${figcaptionCount} figcaptions` : ""}`
        : "No images found",
      imageCount === 0 ? "neutral" : undefined,
    ),
  );

  rawData.imageAccessibility = { imageCount, imagesWithAlt, figcaptionCount };

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.contentExtractability,
      key: "contentExtractability",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData,
  };
}

function auditContentStructure(page: ExtractedPage): CategoryAuditOutput {
  const $ = page.$;
  const factors: FactorResultType[] = [];

  const h1 = page.stats.h1Count;
  const h2 = page.stats.h2Count;
  const h3 = page.stats.h3Count;
  let headingScore = 0;
  if (h1 === 1) headingScore += 4;
  else if (h1 > 0) headingScore += 2;
  if (h2 >= 2) headingScore += 4;
  else if (h2 > 0) headingScore += 2;
  if (h3 > 0) headingScore += 3;
  factors.push(
    makeFactor(
      "Heading Hierarchy",
      headingScore,
      11,
      `${h1} H1, ${h2} H2, ${h3} H3`,
    ),
  );

  const listItems = page.stats.listItemCount;
  const listScore = thresholdScore(listItems, [
    [10, 11],
    [5, 8],
    [1, 4],
    [0, 0],
  ]);
  factors.push(
    makeFactor("Lists Presence", listScore, 11, `${listItems} list items`),
  );

  const tables = page.stats.tableCount;
  const tableScore = tables >= 2 ? 8 : tables >= 1 ? 5 : 0;
  factors.push(
    makeFactor(
      "Tables Presence",
      tableScore,
      8,
      `${tables} table(s)`,
      tables === 0 ? "neutral" : undefined,
    ),
  );

  const pCount = page.stats.paragraphCount;
  const avgParagraphWords =
    pCount > 0 ? Math.round(page.stats.wordCount / pCount) : 0;
  const paragraphScore =
    avgParagraphWords >= 30 && avgParagraphWords <= 150
      ? 11
      : avgParagraphWords > 0 && avgParagraphWords < 200
        ? 7
        : 2;
  factors.push(
    makeFactor(
      "Paragraph Structure",
      paragraphScore,
      11,
      `${pCount} paragraphs, avg ${avgParagraphWords} words`,
    ),
  );

  const hasBold = $("strong, b").length > 0;
  const headingRatio = pCount > 0 ? page.stats.headingCount / pCount : 0;
  let scanScore = 0;
  if (hasBold) scanScore += 4;
  if (avgParagraphWords <= 150) scanScore += 4;
  if (headingRatio >= 0.1) scanScore += 3;
  factors.push(
    makeFactor(
      "Scannability",
      scanScore,
      11,
      `${hasBold ? "Bold text found" : "No bold text"}, ${headingRatio.toFixed(2)} heading ratio`,
    ),
  );

  const sectionData = measureSectionLengths(page.$);
  let sectionScore = 0;
  if (sectionData.sectionCount === 0) {
    sectionScore = 0;
  } else if (
    sectionData.avgWordsPerSection >= 120 &&
    sectionData.avgWordsPerSection <= 180
  ) {
    sectionScore = 12;
  } else if (
    sectionData.avgWordsPerSection >= 80 &&
    sectionData.avgWordsPerSection <= 250
  ) {
    sectionScore = 8;
  } else if (sectionData.avgWordsPerSection > 0) {
    sectionScore = 4;
  }
  factors.push(
    makeFactor(
      "Section Length",
      sectionScore,
      12,
      sectionData.sectionCount > 0
        ? `${sectionData.sectionCount} sections, avg ${sectionData.avgWordsPerSection} words`
        : "No headed sections found",
      sectionData.sectionCount === 0 ? "neutral" : undefined,
    ),
  );

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.contentStructure,
      key: "contentStructure",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData: {
      sectionLengths: sectionData,
    },
  };
}

function auditAnswerability(page: ExtractedPage): CategoryAuditOutput {
  const text = page.cleanText;
  const $ = page.$;
  const factors: FactorResultType[] = [];

  const defCount = countPatternMatches(text, DEFINITION_PATTERNS);
  const defScore = thresholdScore(defCount, [
    [6, 10],
    [3, 7],
    [1, 4],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Definition Patterns",
      defScore,
      10,
      `${defCount} definition patterns`,
    ),
  );

  const directCount = countPatternMatches(text, DIRECT_ANSWER_PATTERNS);
  const directScore = thresholdScore(directCount, [
    [5, 11],
    [2, 8],
    [1, 4],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Direct Answer Statements",
      directScore,
      11,
      `${directCount} direct statements`,
    ),
  );

  const capsules = detectAnswerCapsules(page.$);
  const capsuleRatio =
    capsules.total > 0 ? capsules.withCapsule / capsules.total : 0;
  const capsuleScore =
    capsules.total === 0
      ? 0
      : capsuleRatio >= 0.7
        ? 13
        : capsuleRatio >= 0.4
          ? 9
          : capsuleRatio > 0
            ? 5
            : 2;
  factors.push(
    makeFactor(
      "Answer Capsules",
      capsuleScore,
      13,
      capsules.total > 0
        ? `${capsules.withCapsule}/${capsules.total} question headings have answer capsules`
        : "No question-framed H2s found",
      capsules.total === 0 ? "neutral" : undefined,
    ),
  );

  const stepCount = countPatternMatches(text, STEP_PATTERNS);
  const hasOl = $("ol").length > 0;
  const stepTotal = stepCount + (hasOl ? 2 : 0);
  const stepScore = thresholdScore(stepTotal, [
    [5, 10],
    [2, 7],
    [1, 3],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Step-by-Step Content",
      stepScore,
      10,
      `${stepCount} step indicators${hasOl ? ", ordered lists found" : ""}`,
    ),
  );

  const questions = (text.match(/[^.!?]*\?/g) || []).length;
  const queryMatches = countPatternMatches(text, QUESTION_PATTERNS);
  const qaScore = thresholdScore(questions + queryMatches, [
    [10, 11],
    [5, 8],
    [2, 5],
    [1, 2],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Q/A Patterns",
      qaScore,
      11,
      `${questions} questions, ${queryMatches} query patterns`,
    ),
  );

  const summaryCount = countPatternMatches(text, SUMMARY_MARKERS);
  const summaryScore = summaryCount >= 2 ? 9 : summaryCount > 0 ? 5 : 0;
  factors.push(
    makeFactor(
      "Summary/Conclusion",
      summaryScore,
      9,
      summaryCount > 0
        ? `${summaryCount} summary markers`
        : "No summary markers",
    ),
  );

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.answerability,
      key: "answerability",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData: {
      answerCapsules: capsules,
      questionsFound: (text.match(/[^.!?]*\?/g) || []).slice(0, 5),
    },
  };
}

function auditEntityClarity(page: ExtractedPage): CategoryAuditOutput {
  const text = page.cleanText;
  const factors: FactorResultType[] = [];

  const entities = extractEntities(text);
  const totalEntities =
    entities.people.length +
    entities.organizations.length +
    entities.places.length +
    entities.topics.length;

  const richScore = thresholdScore(totalEntities, [
    [9, 20],
    [4, 14],
    [1, 7],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Entity Richness",
      richScore,
      20,
      `${totalEntities} entities (${entities.people.length} people, ${entities.organizations.length} orgs, ${entities.places.length} places)`,
      totalEntities === 0 ? "neutral" : undefined,
    ),
  );

  const titleWords = page.title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const h1Text = page.$("h1").first().text().toLowerCase();
  const h1Words = h1Text.split(/\s+/).filter((w) => w.length > 3);
  const keyWords = [...new Set([...titleWords, ...h1Words])];
  const topicLower = entities.topics.map((t) => t.toLowerCase());

  let topicOverlap = 0;
  for (const kw of keyWords) {
    if (
      topicLower.some((t) => t.includes(kw)) ||
      text.toLowerCase().split(kw).length > 3
    ) {
      topicOverlap++;
    }
  }

  const consistencyRatio =
    keyWords.length > 0 ? topicOverlap / keyWords.length : 0;
  const consistencyScore =
    consistencyRatio >= 0.5 ? 25 : consistencyRatio > 0 ? 15 : 5;
  factors.push(
    makeFactor(
      "Topic Consistency",
      consistencyScore,
      25,
      `${topicOverlap}/${keyWords.length} title keywords align with content topics`,
    ),
  );

  const wordCount = countWords(text);
  const densityPer100 = wordCount > 0 ? (totalEntities / wordCount) * 100 : 0;
  const densityScore =
    densityPer100 >= 2 && densityPer100 <= 8
      ? 15
      : densityPer100 >= 1
        ? 10
        : densityPer100 > 8
          ? 10
          : 3;
  factors.push(
    makeFactor(
      "Entity Density",
      densityScore,
      15,
      `${densityPer100.toFixed(1)} entities per 100 words`,
    ),
  );

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.entityClarity,
      key: "entityClarity",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData: {
      entities,
    },
  };
}

function auditGroundingSignals(page: ExtractedPage): CategoryAuditOutput {
  const $ = page.$;
  const text = page.cleanText;
  const factors: FactorResultType[] = [];

  const externalLinks: Array<{ url: string; text: string }> = [];
  const pageDomain = getDomain(page.url);
  $('a[href^="http"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      try {
        if (getDomain(href) !== pageDomain) {
          externalLinks.push({
            url: href,
            text: $(el).text().trim().substring(0, 50),
          });
        }
      } catch {}
    }
  });

  const extScore = thresholdScore(externalLinks.length, [
    [6, 13],
    [3, 10],
    [1, 6],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "External References",
      extScore,
      13,
      `${externalLinks.length} external links`,
    ),
  );

  const citationCount = countPatternMatches(text, CITATION_PATTERNS);
  const blockquotes = $("blockquote, cite, q").length;
  const totalCitations = citationCount + blockquotes;
  const citScore = thresholdScore(totalCitations, [
    [6, 13],
    [3, 9],
    [1, 5],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Citation Patterns",
      citScore,
      13,
      `${citationCount} citation indicators, ${blockquotes} quote elements`,
    ),
  );

  const numericCount = countPatternMatches(text, NUMERIC_CLAIM_PATTERNS);
  const numScore = thresholdScore(numericCount, [
    [9, 13],
    [4, 9],
    [1, 5],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Numeric Claims",
      numScore,
      13,
      `${numericCount} statistical references`,
    ),
  );

  const attrCount = countPatternMatches(text, ATTRIBUTION_PATTERNS);
  const attrScore = thresholdScore(attrCount, [
    [5, 11],
    [2, 8],
    [1, 4],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Attribution Indicators",
      attrScore,
      11,
      `${attrCount} attribution patterns`,
    ),
  );

  const quotedAttrPatterns = countPatternMatches(
    text,
    QUOTED_ATTRIBUTION_PATTERNS,
  );
  const blockquotesWithCite = $("blockquote").filter(
    (_, el) => $(el).find("cite, footer, figcaption").length > 0,
  ).length;
  const totalQuotedAttr = quotedAttrPatterns + blockquotesWithCite;
  const quotedAttrScore = thresholdScore(totalQuotedAttr, [
    [4, 10],
    [2, 7],
    [1, 4],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Quoted Attribution",
      quotedAttrScore,
      10,
      `${totalQuotedAttr} attributed quotes`,
      totalQuotedAttr === 0 ? "neutral" : undefined,
    ),
  );

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.groundingSignals,
      key: "groundingSignals",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData: {
      externalLinks: externalLinks.slice(0, 10),
    },
  };
}

function auditAuthorityContext(page: ExtractedPage): CategoryAuditOutput {
  const $ = page.$;
  const factors: FactorResultType[] = [];
  const rawData: CategoryAuditOutput["rawData"] = {};

  let authorFound = false;
  let authorName = "";
  for (const selector of AUTHOR_SELECTORS) {
    const elem = $(selector).first();
    if (elem.length) {
      authorFound = true;
      authorName = elem.text().trim() || elem.attr("content") || "Found";
      break;
    }
  }
  factors.push(
    makeFactor(
      "Author Attribution",
      authorFound ? 10 : 0,
      10,
      authorFound ? authorName : "Not found",
    ),
  );

  const hasOrgSchema =
    page.html.includes('"@type":"Organization"') ||
    page.html.includes('"@type": "Organization"');
  const ogSiteName = $('meta[property="og:site_name"]').attr("content") || "";
  const orgFound = hasOrgSchema || ogSiteName.length > 0;
  factors.push(
    makeFactor(
      "Organization Identity",
      orgFound ? 10 : 0,
      10,
      orgFound ? ogSiteName || "Schema found" : "Not found",
    ),
  );

  const aboutLink =
    $('a[href*="about"], a[href*="team"], a[href*="company"]').length > 0;
  const contactLink = $('a[href*="contact"]').length > 0;
  const contactScore =
    aboutLink && contactLink ? 10 : aboutLink || contactLink ? 5 : 0;
  factors.push(
    makeFactor(
      "Contact/About Links",
      contactScore,
      10,
      `${aboutLink ? "About" : ""}${aboutLink && contactLink ? " + " : ""}${contactLink ? "Contact" : ""}${!aboutLink && !contactLink ? "Not found" : ""}`,
    ),
  );

  let dateFound = false;
  let dateValue = "";
  for (const selector of DATE_SELECTORS) {
    const elem = $(selector).first();
    if (elem.length) {
      dateFound = true;
      dateValue =
        elem.attr("datetime") || elem.attr("content") || elem.text().trim();
      break;
    }
  }
  factors.push(
    makeFactor(
      "Publication Date",
      dateFound ? 8 : 0,
      8,
      dateFound ? dateValue : "Not found",
    ),
  );

  const freshness = evaluateFreshness(page.$);
  let freshScore = 0;
  if (freshness.ageInMonths !== null) {
    if (freshness.ageInMonths <= 6) freshScore = 12;
    else if (freshness.ageInMonths <= 12) freshScore = 9;
    else if (freshness.ageInMonths <= 24) freshScore = 5;
    else freshScore = 2;
    if (freshness.hasModifiedDate && freshScore < 12)
      freshScore = Math.min(freshScore + 2, 12);
  }
  factors.push(
    makeFactor(
      "Content Freshness",
      freshScore,
      12,
      freshness.ageInMonths !== null
        ? `${freshness.ageInMonths} months old${freshness.hasModifiedDate ? ", modified date present" : ""}`
        : "No parseable date found",
    ),
  );

  rawData.freshness = freshness;

  const jsonLdScripts = $('script[type="application/ld+json"]');
  const structuredDataTypes: string[] = [];
  jsonLdScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      if (data["@type"]) structuredDataTypes.push(data["@type"]);
    } catch {}
  });

  const ogTags = ["og:title", "og:description", "og:image", "og:type"];
  const foundOgTags = ogTags.filter(
    (tag) => $(`meta[property="${tag}"]`).length > 0,
  );
  const canonical = $('link[rel="canonical"]').attr("href");

  let structuredScore = 0;
  if (structuredDataTypes.length > 0) structuredScore += 4;
  if (foundOgTags.length >= 3) structuredScore += 4;
  else if (foundOgTags.length > 0) structuredScore += 2;
  if (canonical) structuredScore += 4;

  rawData.structuredDataTypes = structuredDataTypes;

  factors.push(
    makeFactor(
      "Structured Data",
      structuredScore,
      12,
      `${structuredDataTypes.length > 0 ? structuredDataTypes.join(", ") : "No JSON-LD"}, ${foundOgTags.length}/4 OG tags${canonical ? ", canonical" : ""}`,
    ),
  );

  const schemaObjects = parseJsonLdObjects(page.$);
  const completeness = evaluateSchemaCompleteness(schemaObjects);
  const schemaCompleteScore =
    completeness.totalTypes === 0
      ? 0
      : completeness.avgCompleteness >= 0.8
        ? 10
        : completeness.avgCompleteness >= 0.5
          ? 7
          : completeness.avgCompleteness > 0
            ? 4
            : 0;
  factors.push(
    makeFactor(
      "Schema Completeness",
      schemaCompleteScore,
      10,
      completeness.totalTypes > 0
        ? `${completeness.totalTypes} schema types, ${Math.round(completeness.avgCompleteness * 100)}% complete`
        : "No recognized JSON-LD schemas found",
      completeness.totalTypes === 0 ? "neutral" : undefined,
    ),
  );

  rawData.schemaCompleteness = completeness;

  const entityName = resolveEntityName(page.$, page.html);
  const consistency = measureEntityConsistency(page.$, page.title, entityName);
  factors.push(
    makeFactor(
      "Entity Consistency",
      consistency.score,
      10,
      entityName
        ? `"${entityName}" found in ${consistency.surfacesFound}/${consistency.surfacesChecked} surfaces`
        : "No identifiable entity name",
      !entityName ? "neutral" : undefined,
    ),
  );

  rawData.entityConsistency = {
    entityName: entityName || null,
    surfacesFound: consistency.surfacesFound,
    surfacesChecked: consistency.surfacesChecked,
  };

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.authorityContext,
      key: "authorityContext",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData,
  };
}

function auditReadabilityForCompression(
  page: ExtractedPage,
): CategoryAuditOutput {
  const text = page.cleanText;
  const factors: FactorResultType[] = [];

  const avgSentLen = avgSentenceLength(text);
  const sentScore =
    avgSentLen >= 12 && avgSentLen <= 22
      ? 15
      : avgSentLen >= 8 && avgSentLen < 30
        ? 10
        : avgSentLen > 0
          ? 5
          : 0;
  factors.push(
    makeFactor(
      "Sentence Length",
      sentScore,
      15,
      `Avg ${avgSentLen} words/sentence`,
    ),
  );

  const fre = computeFleschReadingEase(text);
  const freScore =
    fre >= 60 && fre <= 70
      ? 15
      : fre > 70
        ? 13
        : fre >= 50
          ? 10
          : fre >= 30
            ? 6
            : 3;
  factors.push(
    makeFactor(
      "Readability",
      freScore,
      15,
      `Flesch Reading Ease: ${fre.toFixed(1)}`,
    ),
  );

  const totalWords = countWords(text);
  const complex = countComplexWords(text);
  const jargonRatio = totalWords > 0 ? complex / totalWords : 0;
  const jargonScore =
    jargonRatio <= 0.02
      ? 15
      : jargonRatio <= 0.05
        ? 12
        : jargonRatio <= 0.1
          ? 8
          : 3;
  factors.push(
    makeFactor(
      "Jargon Density",
      jargonScore,
      15,
      `${(jargonRatio * 100).toFixed(1)}% complex words`,
    ),
  );

  const transCount = countTransitionWords(text, TRANSITION_WORDS);
  const transScore = thresholdScore(transCount, [
    [10, 15],
    [5, 11],
    [2, 7],
    [1, 3],
    [0, 0],
  ]);
  factors.push(
    makeFactor(
      "Transition Usage",
      transScore,
      15,
      `${transCount} transition types found`,
    ),
  );

  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES.readabilityForCompression,
      key: "readabilityForCompression",
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData: {
      avgSentenceLength: avgSentLen,
      readabilityScore: fre,
    },
  };
}
