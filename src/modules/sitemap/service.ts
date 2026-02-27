import { httpGet } from "../../utils/http.js";
import { normalizeUrl } from "../../utils/url.js";
import { VERSION } from "../analyzer/constants.js";
import {
  analyzeUrlWithSignals,
  fetchDomainSignals,
} from "../analyzer/service.js";
import type { AiseoConfigType } from "../config/schema.js";
import { fetchUrl } from "../fetcher/service.js";
import { computeGrade } from "../scoring/service.js";
import type {
  SitemapOptionsType,
  SitemapResultType,
  SitemapUrlResultType,
} from "./schema.js";

async function fetchSitemapUrls(
  sitemapUrl: string,
  timeout: number,
  userAgent: string,
): Promise<string[]> {
  const response = await httpGet({
    url: sitemapUrl,
    timeout,
    userAgent,
  });

  if (response.status !== 200) {
    throw new Error(`Failed to fetch sitemap: HTTP ${response.status}`);
  }

  const isSitemapIndex = response.data.includes("<sitemapindex");

  if (isSitemapIndex) {
    return fetchSitemapIndexUrls(response.data, timeout, userAgent);
  }

  return extractLocUrls(response.data);
}

async function fetchSitemapIndexUrls(
  xml: string,
  timeout: number,
  userAgent: string,
): Promise<string[]> {
  const childSitemapUrls = extractLocUrls(xml);
  const allUrls: string[] = [];

  for (const childUrl of childSitemapUrls) {
    const response = await httpGet({
      url: childUrl,
      timeout,
      userAgent,
    });
    if (response.status === 200) {
      allUrls.push(...extractLocUrls(response.data));
    }
  }

  return allUrls;
}

function extractLocUrls(xml: string): string[] {
  const matches = xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/g);
  return Array.from(matches, (m) => m[1]).filter(Boolean);
}

function computeCategoryAverages(
  urlResults: SitemapUrlResultType[],
): SitemapResultType["categoryAverages"] {
  const successResults = urlResults
    .filter((r) => r.status === "success")
    .map(
      (r) => (r as Extract<SitemapUrlResultType, { status: "success" }>).result,
    );

  if (successResults.length === 0) return {};

  const categoryTotals: Record<
    string,
    { name: string; totalPct: number; count: number }
  > = {};

  for (const result of successResults) {
    for (const [key, category] of Object.entries(result.categories)) {
      const pct =
        category.maxScore > 0 ? (category.score / category.maxScore) * 100 : 0;

      if (!categoryTotals[key]) {
        categoryTotals[key] = { name: category.name, totalPct: 0, count: 0 };
      }

      categoryTotals[key].totalPct += pct;
      categoryTotals[key].count += 1;
    }
  }

  const averages: SitemapResultType["categoryAverages"] = {};
  for (const [key, totals] of Object.entries(categoryTotals)) {
    averages[key] = {
      name: totals.name,
      averagePct: Math.round(totals.totalPct / totals.count),
    };
  }

  return averages;
}

export async function analyzeSitemap(
  options: SitemapOptionsType,
  config: AiseoConfigType,
): Promise<SitemapResultType> {
  const startTime = Date.now();
  const timeout = options.timeout ?? config.timeout;
  const userAgent = options.userAgent ?? config.userAgent;

  const urls = await fetchSitemapUrls(options.sitemapUrl, timeout, userAgent);

  const sitemapDir = options.sitemapUrl.substring(
    0,
    options.sitemapUrl.lastIndexOf("/"),
  );
  const signalsBase = options.signalsBase ?? sitemapDir;
  const domainSignals = await fetchDomainSignals(
    signalsBase,
    timeout,
    userAgent,
  );

  const urlResults: SitemapUrlResultType[] = [];

  for (const rawUrl of urls) {
    const url = normalizeUrl(rawUrl);
    try {
      const fetchResult = await fetchUrl({ url, timeout, userAgent });
      const result = await analyzeUrlWithSignals(
        url,
        fetchResult,
        domainSignals,
        config,
      );
      urlResults.push({ status: "success", result });
    } catch (error) {
      urlResults.push({
        status: "failed",
        url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const successResults = urlResults
    .filter((r) => r.status === "success")
    .map(
      (r) => (r as Extract<SitemapUrlResultType, { status: "success" }>).result,
    );

  const succeededCount = successResults.length;
  const failedCount = urlResults.length - succeededCount;

  const averageScore =
    succeededCount > 0
      ? Math.round(
          successResults.reduce((sum, r) => sum + r.overallScore, 0) /
            succeededCount,
        )
      : 0;

  const averageGrade = computeGrade(averageScore);
  const categoryAverages = computeCategoryAverages(urlResults);

  return {
    sitemapUrl: options.sitemapUrl,
    signalsBase: domainSignals.signalsBase,
    analyzedAt: new Date().toISOString(),
    totalUrls: urlResults.length,
    succeededCount,
    failedCount,
    averageScore,
    averageGrade,
    categoryAverages,
    urlResults,
    meta: {
      version: VERSION,
      analysisDurationMs: Date.now() - startTime,
    },
  };
}
