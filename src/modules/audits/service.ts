import type { ExtractedPage } from '../extractor/schema.js';
import type { FetchResult } from '../fetcher/schema.js';
import type { AuditResult, CategoryResult, FactorResult } from './schema.js';
import { CATEGORY_DISPLAY_NAMES } from './constants.js';
import { makeFactor, sumFactors, maxFactors, thresholdScore } from './support/scoring.js';
import {
  DEFINITION_PATTERNS,
  CITATION_PATTERNS,
  ATTRIBUTION_PATTERNS,
  NUMERIC_CLAIM_PATTERNS,
  STEP_PATTERNS,
  SUMMARY_MARKERS,
  QUESTION_PATTERNS,
  DIRECT_ANSWER_PATTERNS,
  QUOTED_ATTRIBUTION_PATTERNS,
  TRANSITION_WORDS,
  AUTHOR_SELECTORS,
  DATE_SELECTORS,
  CREDENTIAL_TERMS,
  FAQ_INDICATORS,
} from './support/patterns.js';
import {
  extractEntities,
  computeFleschReadingEase,
  countComplexWords,
  countPatternMatches,
  countTransitionWords,
  avgSentenceLength,
  detectAnswerCapsules,
  evaluateFreshness,
  measureSectionLengths,
  checkCrawlerAccess,
} from './support/language.js';
import { countWords } from '../../utils/strings.js';
import { getDomain } from '../../utils/url.js';

export interface DomainSignals {
  robotsTxt: string | null;
  llmsTxtExists: boolean;
  llmsFullTxtExists: boolean;
}

export function runAudits(
  page: ExtractedPage,
  fetchResult: FetchResult,
  domainSignals?: DomainSignals
): AuditResult {
  const rawData: Record<string, unknown> = {};

  const categories = {
    contentExtractability: auditContentExtractability(page, fetchResult, rawData, domainSignals),
    contentStructure: auditContentStructure(page, rawData),
    answerability: auditAnswerability(page, rawData),
    entityClarity: auditEntityClarity(page, rawData),
    groundingSignals: auditGroundingSignals(page, rawData),
    authorityContext: auditAuthorityContext(page, rawData),
    readabilityForCompression: auditReadabilityForCompression(page, rawData),
  };

  return { categories, rawData };
}

function auditContentExtractability(
  page: ExtractedPage,
  fetchResult: FetchResult,
  rawData: Record<string, unknown>,
  domainSignals?: DomainSignals
): CategoryResult {
  const factors: FactorResult[] = [];

  // Fetch success
  const fetchScore = fetchResult.statusCode === 200
    ? 12
    : fetchResult.statusCode < 400 ? 8 : 0;
  factors.push(makeFactor(
    'Fetch Success',
    fetchScore, 12,
    `HTTP ${fetchResult.statusCode} in ${fetchResult.fetchTimeMs}ms`,
  ));

  // Text extraction quality
  const extractRatio = page.stats.rawByteLength > 0
    ? page.stats.cleanTextLength / page.stats.rawByteLength
    : 0;
  const extractScore = extractRatio >= 0.05 && extractRatio <= 0.15 ? 12
    : extractRatio >= 0.01 ? 8
    : extractRatio > 0.15 ? 10
    : 2;
  factors.push(makeFactor(
    'Text Extraction Quality',
    extractScore, 12,
    `${(extractRatio * 100).toFixed(1)}% content ratio`,
  ));

  // Boilerplate ratio
  const bpRatio = page.stats.boilerplateRatio;
  const bpScore = thresholdScore(1 - bpRatio, [
    [0.7, 12], [0.5, 9], [0.3, 6], [0, 2],
  ]);
  factors.push(makeFactor(
    'Boilerplate Ratio',
    bpScore, 12,
    `${(bpRatio * 100).toFixed(0)}% boilerplate`,
  ));

  // Word count adequacy
  const wc = page.stats.wordCount;
  const wcScore = wc >= 300 && wc <= 3000 ? 12
    : wc >= 100 ? 8
    : wc > 3000 ? 10
    : 2;
  factors.push(makeFactor(
    'Word Count Adequacy',
    wcScore, 12,
    `${wc} words`,
  ));

  // Gap 5: AI Crawler Access
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
        ? `All major AI crawlers allowed`
        : `${access.blocked.join(', ')} blocked in robots.txt`,
    ));

    rawData.crawlerAccess = access;

    // Gap 5: llms.txt + llms-full.txt Presence
    const hasLlms = domainSignals.llmsTxtExists;
    const hasLlmsFull = domainSignals.llmsFullTxtExists;
    const llmsScore = hasLlms && hasLlmsFull ? 6
      : hasLlms || hasLlmsFull ? 4
      : 0;
    factors.push(makeFactor(
      'LLMs.txt Presence',
      llmsScore, 6,
      hasLlms && hasLlmsFull ? 'llms.txt + llms-full.txt found'
        : hasLlms ? 'llms.txt found'
        : hasLlmsFull ? 'llms-full.txt found'
        : 'Not found',
      !hasLlms && !hasLlmsFull ? 'neutral' : undefined,
    ));
  }

  rawData.title = page.title;
  rawData.metaDescription = page.metaDescription;
  rawData.wordCount = wc;

  return {
    name: CATEGORY_DISPLAY_NAMES.contentExtractability,
    key: 'contentExtractability',
    score: sumFactors(factors),
    maxScore: maxFactors(factors),
    factors,
  };
}

function auditContentStructure(
  page: ExtractedPage,
  rawData: Record<string, unknown>
): CategoryResult {
  const $ = page.$;
  const factors: FactorResult[] = [];

  // Heading hierarchy
  const h1 = page.stats.h1Count;
  const h2 = page.stats.h2Count;
  const h3 = page.stats.h3Count;
  let headingScore = 0;
  if (h1 === 1) headingScore += 4;
  else if (h1 > 0) headingScore += 2;
  if (h2 >= 2) headingScore += 4;
  else if (h2 > 0) headingScore += 2;
  if (h3 > 0) headingScore += 3;
  factors.push(makeFactor(
    'Heading Hierarchy',
    headingScore, 11,
    `${h1} H1, ${h2} H2, ${h3} H3`,
  ));

  // Lists presence
  const listItems = page.stats.listItemCount;
  const listScore = thresholdScore(listItems, [
    [10, 11], [5, 8], [1, 4], [0, 0],
  ]);
  factors.push(makeFactor(
    'Lists Presence',
    listScore, 11,
    `${listItems} list items`,
  ));

  // Tables presence
  const tables = page.stats.tableCount;
  const tableScore = tables >= 2 ? 8 : tables >= 1 ? 5 : 0;
  factors.push(makeFactor(
    'Tables Presence',
    tableScore, 8,
    `${tables} table(s)`,
    tables === 0 ? 'neutral' : undefined,
  ));

  // Paragraph structure
  const pCount = page.stats.paragraphCount;
  const avgParagraphWords = pCount > 0
    ? Math.round(page.stats.wordCount / pCount)
    : 0;
  const paragraphScore = avgParagraphWords >= 30 && avgParagraphWords <= 150 ? 11
    : avgParagraphWords > 0 && avgParagraphWords < 200 ? 7
    : 2;
  factors.push(makeFactor(
    'Paragraph Structure',
    paragraphScore, 11,
    `${pCount} paragraphs, avg ${avgParagraphWords} words`,
  ));

  // Scannability
  const hasBold = $('strong, b').length > 0;
  const headingRatio = pCount > 0 ? page.stats.headingCount / pCount : 0;
  let scanScore = 0;
  if (hasBold) scanScore += 4;
  if (avgParagraphWords <= 150) scanScore += 4;
  if (headingRatio >= 0.1) scanScore += 3;
  factors.push(makeFactor(
    'Scannability',
    scanScore, 11,
    `${hasBold ? 'Bold text found' : 'No bold text'}, ${headingRatio.toFixed(2)} heading ratio`,
  ));

  // Gap 3: Section Length (words between headings)
  const sectionData = measureSectionLengths(page.$);
  let sectionScore = 0;
  if (sectionData.sectionCount === 0) {
    sectionScore = 0;
  } else if (sectionData.avgWordsPerSection >= 120 && sectionData.avgWordsPerSection <= 180) {
    sectionScore = 12;
  } else if (sectionData.avgWordsPerSection >= 80 && sectionData.avgWordsPerSection <= 250) {
    sectionScore = 8;
  } else if (sectionData.avgWordsPerSection > 0) {
    sectionScore = 4;
  }
  factors.push(makeFactor(
    'Section Length',
    sectionScore, 12,
    sectionData.sectionCount > 0
      ? `${sectionData.sectionCount} sections, avg ${sectionData.avgWordsPerSection} words`
      : 'No headed sections found',
    sectionData.sectionCount === 0 ? 'neutral' : undefined,
  ));

  rawData.sectionLengths = sectionData;

  return {
    name: CATEGORY_DISPLAY_NAMES.contentStructure,
    key: 'contentStructure',
    score: sumFactors(factors),
    maxScore: maxFactors(factors),
    factors,
  };
}

function auditAnswerability(
  page: ExtractedPage,
  rawData: Record<string, unknown>
): CategoryResult {
  const text = page.cleanText;
  const $ = page.$;
  const factors: FactorResult[] = [];

  // Definition patterns
  const defCount = countPatternMatches(text, DEFINITION_PATTERNS);
  const defScore = thresholdScore(defCount, [
    [6, 10], [3, 7], [1, 4], [0, 0],
  ]);
  factors.push(makeFactor(
    'Definition Patterns',
    defScore, 10,
    `${defCount} definition patterns`,
  ));

  // Direct answer patterns
  const directCount = countPatternMatches(text, DIRECT_ANSWER_PATTERNS);
  const directScore = thresholdScore(directCount, [
    [5, 11], [2, 8], [1, 4], [0, 0],
  ]);
  factors.push(makeFactor(
    'Direct Answer Statements',
    directScore, 11,
    `${directCount} direct statements`,
  ));

  // Gap 1: Answer Capsules
  const capsules = detectAnswerCapsules(page.$);
  const capsuleRatio = capsules.total > 0 ? capsules.withCapsule / capsules.total : 0;
  const capsuleScore = capsules.total === 0 ? 0
    : capsuleRatio >= 0.7 ? 13
    : capsuleRatio >= 0.4 ? 9
    : capsuleRatio > 0 ? 5 : 2;
  factors.push(makeFactor(
    'Answer Capsules',
    capsuleScore, 13,
    capsules.total > 0
      ? `${capsules.withCapsule}/${capsules.total} question headings have answer capsules`
      : 'No question-framed H2s found',
    capsules.total === 0 ? 'neutral' : undefined,
  ));

  rawData.answerCapsules = capsules;

  // Step-by-step patterns
  const stepCount = countPatternMatches(text, STEP_PATTERNS);
  const hasOl = $('ol').length > 0;
  const stepTotal = stepCount + (hasOl ? 2 : 0);
  const stepScore = thresholdScore(stepTotal, [
    [5, 10], [2, 7], [1, 3], [0, 0],
  ]);
  factors.push(makeFactor(
    'Step-by-Step Content',
    stepScore, 10,
    `${stepCount} step indicators${hasOl ? ', ordered lists found' : ''}`,
  ));

  // Q/A patterns
  const questions = (text.match(/[^.!?]*\?/g) || []).length;
  const queryMatches = countPatternMatches(text, QUESTION_PATTERNS);
  const qaScore = thresholdScore(questions + queryMatches, [
    [10, 11], [5, 8], [2, 5], [1, 2], [0, 0],
  ]);
  factors.push(makeFactor(
    'Q/A Patterns',
    qaScore, 11,
    `${questions} questions, ${queryMatches} query patterns`,
  ));

  rawData.questionsFound = (text.match(/[^.!?]*\?/g) || []).slice(0, 5);

  // Summary / conclusion markers
  const summaryCount = countPatternMatches(text, SUMMARY_MARKERS);
  const summaryScore = summaryCount >= 2 ? 9 : summaryCount > 0 ? 5 : 0;
  factors.push(makeFactor(
    'Summary/Conclusion',
    summaryScore, 9,
    summaryCount > 0 ? `${summaryCount} summary markers` : 'No summary markers',
  ));

  return {
    name: CATEGORY_DISPLAY_NAMES.answerability,
    key: 'answerability',
    score: sumFactors(factors),
    maxScore: maxFactors(factors),
    factors,
  };
}

function auditEntityClarity(
  page: ExtractedPage,
  rawData: Record<string, unknown>
): CategoryResult {
  const text = page.cleanText;
  const factors: FactorResult[] = [];

  const entities = extractEntities(text);
  const totalEntities = entities.people.length + entities.organizations.length +
    entities.places.length + entities.topics.length;

  rawData.entities = entities;

  // Entity extraction richness
  const richScore = thresholdScore(totalEntities, [
    [9, 20], [4, 14], [1, 7], [0, 0],
  ]);
  factors.push(makeFactor(
    'Entity Richness',
    richScore, 20,
    `${totalEntities} entities (${entities.people.length} people, ${entities.organizations.length} orgs, ${entities.places.length} places)`,
    totalEntities === 0 ? 'neutral' : undefined,
  ));

  // Topic consistency with title/H1
  const titleWords = page.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const h1Text = page.$('h1').first().text().toLowerCase();
  const h1Words = h1Text.split(/\s+/).filter(w => w.length > 3);
  const keyWords = [...new Set([...titleWords, ...h1Words])];
  const topicLower = entities.topics.map(t => t.toLowerCase());

  let topicOverlap = 0;
  for (const kw of keyWords) {
    if (topicLower.some(t => t.includes(kw)) || text.toLowerCase().split(kw).length > 3) {
      topicOverlap++;
    }
  }

  const consistencyRatio = keyWords.length > 0 ? topicOverlap / keyWords.length : 0;
  const consistencyScore = consistencyRatio >= 0.5 ? 25
    : consistencyRatio > 0 ? 15
    : 5;
  factors.push(makeFactor(
    'Topic Consistency',
    consistencyScore, 25,
    `${topicOverlap}/${keyWords.length} title keywords align with content topics`,
  ));

  // Entity density
  const wordCount = countWords(text);
  const densityPer100 = wordCount > 0 ? (totalEntities / wordCount) * 100 : 0;
  const densityScore = densityPer100 >= 2 && densityPer100 <= 8 ? 15
    : densityPer100 >= 1 ? 10
    : densityPer100 > 8 ? 10
    : 3;
  factors.push(makeFactor(
    'Entity Density',
    densityScore, 15,
    `${densityPer100.toFixed(1)} entities per 100 words`,
  ));

  return {
    name: CATEGORY_DISPLAY_NAMES.entityClarity,
    key: 'entityClarity',
    score: sumFactors(factors),
    maxScore: maxFactors(factors),
    factors,
  };
}

function auditGroundingSignals(
  page: ExtractedPage,
  rawData: Record<string, unknown>
): CategoryResult {
  const $ = page.$;
  const text = page.cleanText;
  const factors: FactorResult[] = [];

  // External references
  const externalLinks: Array<{ url: string; text: string }> = [];
  const pageDomain = getDomain(page.url);
  $('a[href^="http"]').each((_, el) => {
    const href = $(el).attr('href');
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
    [6, 13], [3, 10], [1, 6], [0, 0],
  ]);
  factors.push(makeFactor(
    'External References',
    extScore, 13,
    `${externalLinks.length} external links`,
  ));

  rawData.externalLinks = externalLinks.slice(0, 10);

  // Citation patterns
  const citationCount = countPatternMatches(text, CITATION_PATTERNS);
  const blockquotes = $('blockquote, cite, q').length;
  const totalCitations = citationCount + blockquotes;
  const citScore = thresholdScore(totalCitations, [
    [6, 13], [3, 9], [1, 5], [0, 0],
  ]);
  factors.push(makeFactor(
    'Citation Patterns',
    citScore, 13,
    `${citationCount} citation indicators, ${blockquotes} quote elements`,
  ));

  // Numeric claims
  const numericCount = countPatternMatches(text, NUMERIC_CLAIM_PATTERNS);
  const numScore = thresholdScore(numericCount, [
    [9, 13], [4, 9], [1, 5], [0, 0],
  ]);
  factors.push(makeFactor(
    'Numeric Claims',
    numScore, 13,
    `${numericCount} statistical references`,
  ));

  // Attribution indicators
  const attrCount = countPatternMatches(text, ATTRIBUTION_PATTERNS);
  const attrScore = thresholdScore(attrCount, [
    [5, 11], [2, 8], [1, 4], [0, 0],
  ]);
  factors.push(makeFactor(
    'Attribution Indicators',
    attrScore, 11,
    `${attrCount} attribution patterns`,
  ));

  // Gap 4: Quoted Attribution
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

  return {
    name: CATEGORY_DISPLAY_NAMES.groundingSignals,
    key: 'groundingSignals',
    score: sumFactors(factors),
    maxScore: maxFactors(factors),
    factors,
  };
}

function auditAuthorityContext(
  page: ExtractedPage,
  rawData: Record<string, unknown>
): CategoryResult {
  const $ = page.$;
  const text = page.cleanText;
  const factors: FactorResult[] = [];

  // Author attribution
  let authorFound = false;
  let authorName = '';
  for (const selector of AUTHOR_SELECTORS) {
    const elem = $(selector).first();
    if (elem.length) {
      authorFound = true;
      authorName = elem.text().trim() || elem.attr('content') || 'Found';
      break;
    }
  }
  factors.push(makeFactor(
    'Author Attribution',
    authorFound ? 10 : 0, 10,
    authorFound ? authorName : 'Not found',
  ));

  // Organization identity
  const hasOrgSchema = page.html.includes('"@type":"Organization"') ||
    page.html.includes('"@type": "Organization"');
  const ogSiteName = $('meta[property="og:site_name"]').attr('content') || '';
  const orgFound = hasOrgSchema || ogSiteName.length > 0;
  factors.push(makeFactor(
    'Organization Identity',
    orgFound ? 10 : 0, 10,
    orgFound ? (ogSiteName || 'Schema found') : 'Not found',
  ));

  // Contact / About links
  const aboutLink = $('a[href*="about"], a[href*="team"], a[href*="company"]').length > 0;
  const contactLink = $('a[href*="contact"]').length > 0;
  const contactScore = aboutLink && contactLink ? 10 : aboutLink || contactLink ? 5 : 0;
  factors.push(makeFactor(
    'Contact/About Links',
    contactScore, 10,
    `${aboutLink ? 'About' : ''}${aboutLink && contactLink ? ' + ' : ''}${contactLink ? 'Contact' : ''}${!aboutLink && !contactLink ? 'Not found' : ''}`,
  ));

  // Publish / updated date (presence check)
  let dateFound = false;
  let dateValue = '';
  for (const selector of DATE_SELECTORS) {
    const elem = $(selector).first();
    if (elem.length) {
      dateFound = true;
      dateValue = elem.attr('datetime') || elem.attr('content') || elem.text().trim();
      break;
    }
  }
  factors.push(makeFactor(
    'Publication Date',
    dateFound ? 8 : 0, 8,
    dateFound ? dateValue : 'Not found',
  ));

  // Gap 2: Content Freshness Evaluation
  const freshness = evaluateFreshness(page.$);
  let freshScore = 0;
  if (freshness.ageInMonths !== null) {
    if (freshness.ageInMonths <= 6) freshScore = 12;
    else if (freshness.ageInMonths <= 12) freshScore = 9;
    else if (freshness.ageInMonths <= 24) freshScore = 5;
    else freshScore = 2;
    if (freshness.hasModifiedDate && freshScore < 12) freshScore = Math.min(freshScore + 2, 12);
  }
  factors.push(makeFactor(
    'Content Freshness',
    freshScore, 12,
    freshness.ageInMonths !== null
      ? `${freshness.ageInMonths} months old${freshness.hasModifiedDate ? ', modified date present' : ''}`
      : 'No parseable date found',
  ));

  rawData.freshness = freshness;

  // Structured data presence
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const structuredDataTypes: string[] = [];
  jsonLdScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      if (data['@type']) structuredDataTypes.push(data['@type']);
    } catch {}
  });

  const ogTags = ['og:title', 'og:description', 'og:image', 'og:type'];
  const foundOgTags = ogTags.filter(tag => $(`meta[property="${tag}"]`).length > 0);
  const canonical = $('link[rel="canonical"]').attr('href');

  let structuredScore = 0;
  if (structuredDataTypes.length > 0) structuredScore += 4;
  if (foundOgTags.length >= 3) structuredScore += 4;
  else if (foundOgTags.length > 0) structuredScore += 2;
  if (canonical) structuredScore += 4;

  rawData.structuredDataTypes = structuredDataTypes;

  factors.push(makeFactor(
    'Structured Data',
    structuredScore, 12,
    `${structuredDataTypes.length > 0 ? structuredDataTypes.join(', ') : 'No JSON-LD'}, ${foundOgTags.length}/4 OG tags${canonical ? ', canonical' : ''}`,
  ));

  return {
    name: CATEGORY_DISPLAY_NAMES.authorityContext,
    key: 'authorityContext',
    score: sumFactors(factors),
    maxScore: maxFactors(factors),
    factors,
  };
}

function auditReadabilityForCompression(
  page: ExtractedPage,
  rawData: Record<string, unknown>
): CategoryResult {
  const text = page.cleanText;
  const factors: FactorResult[] = [];

  // Average sentence length
  const avgSentLen = avgSentenceLength(text);
  const sentScore = avgSentLen >= 12 && avgSentLen <= 22 ? 15
    : avgSentLen >= 8 && avgSentLen < 30 ? 10
    : avgSentLen > 0 ? 5
    : 0;
  factors.push(makeFactor(
    'Sentence Length',
    sentScore, 15,
    `Avg ${avgSentLen} words/sentence`,
  ));

  rawData.avgSentenceLength = avgSentLen;

  // Flesch reading ease
  const fre = computeFleschReadingEase(text);
  const freScore = fre >= 60 && fre <= 70 ? 15
    : fre > 70 ? 13
    : fre >= 50 ? 10
    : fre >= 30 ? 6
    : 3;
  factors.push(makeFactor(
    'Readability',
    freScore, 15,
    `Flesch Reading Ease: ${fre.toFixed(1)}`,
  ));

  rawData.readabilityScore = fre;

  // Jargon density
  const totalWords = countWords(text);
  const complex = countComplexWords(text);
  const jargonRatio = totalWords > 0 ? complex / totalWords : 0;
  const jargonScore = jargonRatio <= 0.02 ? 15
    : jargonRatio <= 0.05 ? 12
    : jargonRatio <= 0.10 ? 8
    : 3;
  factors.push(makeFactor(
    'Jargon Density',
    jargonScore, 15,
    `${(jargonRatio * 100).toFixed(1)}% complex words`,
  ));

  // Transition words
  const transCount = countTransitionWords(text, TRANSITION_WORDS);
  const transScore = thresholdScore(transCount, [
    [10, 15], [5, 11], [2, 7], [1, 3], [0, 0],
  ]);
  factors.push(makeFactor(
    'Transition Usage',
    transScore, 15,
    `${transCount} transition types found`,
  ));

  return {
    name: CATEGORY_DISPLAY_NAMES.readabilityForCompression,
    key: 'readabilityForCompression',
    score: sumFactors(factors),
    maxScore: maxFactors(factors),
    factors,
  };
}
