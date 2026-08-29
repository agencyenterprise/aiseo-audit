import type { ExtractedPageType } from "../extractor/schema.js";
import { buildCategoryOutput } from "../audits/category.js";
import type { FetchResultType } from "../fetcher/schema.js";
import {
  makeDiagnostic,
  makeFactor,
  thresholdScore,
} from "../scoring/service.js";
import type {
  CategoryAuditOutputType,
  DomainSignalsType,
  FactorResultType,
} from "../audits/schema.js";
import { detectPaywallSignals } from "./paywall.js";
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
      [0.05, 0.16, 12],
      [0.16, Infinity, 10],
      [0.01, 0.05, 8],
      [0.0001, 0.01, 2],
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

  factors.push(
    makeDiagnostic("Word Count Adequacy", `${page.stats.wordCount} words`),
  );

  factors.push(paywallSignalsFactor(page));

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
    factors.push(
      makeDiagnostic(
        "LLMs.txt Presence",
        hasLlms && hasLlmsFull
          ? "llms.txt + llms-full.txt found (experimental standard, no outcome evidence)"
          : hasLlms
            ? "llms.txt found (experimental standard, no outcome evidence)"
            : hasLlmsFull
              ? "llms-full.txt found (experimental standard, no outcome evidence)"
              : "Not found (experimental standard, no outcome evidence)",
      ),
    );
  }

  const imageCount = page.stats.imageCount;
  const imagesWithAlt = page.stats.imagesWithAlt;
  const figcaptionCount = page.$("figure figcaption").length;

  factors.push(
    makeDiagnostic(
      "Image Accessibility",
      imageCount > 0
        ? `${imagesWithAlt}/${imageCount} images have alt text${figcaptionCount > 0 ? `, ${figcaptionCount} figcaptions` : ""} (accessibility information)`
        : "No images found",
    ),
  );

  rawData.imageAccessibility = { imageCount, imagesWithAlt, figcaptionCount };

  return buildCategoryOutput("contentExtractability", factors, rawData);
}

function paywallSignalsFactor(page: ExtractedPageType): FactorResultType {
  const paywall = detectPaywallSignals(page.$);

  if (paywall.declaresNotFreelyAccessible || paywall.markerCount >= 2) {
    return makeFactor(
      "Paywall Signals",
      0,
      8,
      paywall.declaresNotFreelyAccessible
        ? "Page declares isAccessibleForFree: false"
        : `${paywall.markerCount} paywall markers found`,
    );
  }
  if (paywall.markerCount === 1) {
    return makeFactor("Paywall Signals", 4, 8, "1 paywall marker found");
  }
  return makeFactor(
    "Paywall Signals",
    8,
    8,
    "No paywall or login barriers detected",
  );
}
