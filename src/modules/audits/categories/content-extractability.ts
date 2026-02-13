import type { ExtractedPageType } from "../../extractor/schema.js";
import type { FetchResultType } from "../../fetcher/schema.js";
import { CATEGORY_DISPLAY_NAMES } from "../constants.js";
import type {
  CategoryAuditOutputType,
  DomainSignalsType,
  FactorResultType,
} from "../schema.js";
import { checkCrawlerAccess } from "../support/robots.js";
import {
  makeFactor,
  maxFactors,
  sumFactors,
  thresholdScore,
} from "../support/scoring.js";

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
