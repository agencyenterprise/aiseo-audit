import type { ExtractedPageType } from "../extractor/schema.js";
import type { FetchResultType } from "../fetcher/schema.js";
import {
  makeFactor,
  maxFactors,
  sumFactors,
  thresholdScore,
} from "../scoring/service.js";
import { CATEGORY_DISPLAY_NAMES } from "../audits/constants.js";
import type {
  CategoryAuditOutputType,
  DomainSignalsType,
  FactorResultType,
} from "../audits/schema.js";
import { checkCrawlerAccess } from "./robots.js";

export function auditContentExtractability(
  page: ExtractedPageType,
  fetchResult: FetchResultType,
  domainSignals?: DomainSignalsType,
): CategoryAuditOutputType {
  const factors: FactorResultType[] = [];
  const rawData: CategoryAuditOutputType["rawData"] = {};

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
  const extractScore = thresholdScore(
    extractRatio,
    [
      [0.05, 0.159, 12],
      [0.16, Infinity, 10],
      [0.01, 0.049, 8],
      [0.0001, 0.009, 2],
    ],
    "range",
  );
  factors.push(
    makeFactor(
      "Text Extraction Quality",
      extractScore,
      12,
      `${(extractRatio * 100).toFixed(1)}% content ratio`,
    ),
  );

  const boilerplateRatio = page.stats.boilerplateRatio;
  const bpScore = thresholdScore(1 - boilerplateRatio, [
    [0.7, 12],
    [0.5, 9],
    [0.3, 6],
    [0.01, 2],
  ]);
  factors.push(
    makeFactor(
      "Boilerplate Ratio",
      bpScore,
      12,
      `${(boilerplateRatio * 100).toFixed(0)}% boilerplate`,
    ),
  );

  const wordCount = page.stats.wordCount;
  const wcScore = thresholdScore(
    wordCount,
    [
      [300, 3000, 12],
      [3001, Infinity, 10],
      [100, 299, 8],
      [1, 99, 2],
    ],
    "range",
  );
  factors.push(
    makeFactor("Word Count Adequacy", wcScore, 12, `${wordCount} words`),
  );

  if (domainSignals) {
    const access = checkCrawlerAccess(domainSignals.robotsTxt);
    const blockedCount = access.blocked.length;
    const crawlerScore = thresholdScore(
      blockedCount,
      [
        [0, 10],
        [2, 6],
        [4, 3],
      ],
      "lower",
    );
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
    rawData.llmsTxt = {
      llmsTxtExists: domainSignals.llmsTxtExists,
      llmsFullTxtExists: domainSignals.llmsFullTxtExists,
    };

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
