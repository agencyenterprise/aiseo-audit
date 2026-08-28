import { scaffold, type XmlNode } from "xml-to-html-converter";
import { httpGet } from "../../utils/http.js";
import { normalizeUrl, originOf } from "../../utils/url.js";
import { VERSION } from "../../version.js";
import {
  analyzeUrlWithSignals,
  fetchDomainSignals,
} from "../analyzer/service.js";
import type { AiseoConfigType } from "../config/schema.js";
import { fetchUrl } from "../fetcher/service.js";
import { computeGrade } from "../scoring/service.js";
import {
  isSuccessResult,
  type SitemapOptionsType,
  type SitemapResultType,
  type SitemapUrlResultType,
} from "./schema.js";

const MAX_SITEMAP_INDEX_DEPTH = 5;

export async function analyzeSitemap(
  options: SitemapOptionsType,
  config: AiseoConfigType,
): Promise<SitemapResultType> {
  const startTime = Date.now();
  const timeout = options.timeout ?? config.timeout;
  const userAgent = options.userAgent ?? config.userAgent;

  const context: SitemapWalkContext = {
    timeout,
    userAgent,
    visited: new Set(),
    warnings: [],
  };
  const urls = [
    ...new Set(await fetchSitemapUrls(options.sitemapUrl, context)),
  ];

  const signalsBase = options.signalsBase ?? originOf(options.sitemapUrl);
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
    .filter(isSuccessResult)
    .map((r) => r.result);

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
    warnings: context.warnings,
    meta: {
      version: VERSION,
      analysisDurationMs: Date.now() - startTime,
    },
  };
}

type SitemapWalkContext = {
  timeout: number;
  userAgent: string;
  visited: Set<string>;
  warnings: string[];
};

async function fetchSitemapUrls(
  sitemapUrl: string,
  context: SitemapWalkContext,
  depth = 0,
): Promise<string[]> {
  if (context.visited.has(sitemapUrl)) return [];
  context.visited.add(sitemapUrl);

  const response = await httpGet({
    url: sitemapUrl,
    timeout: context.timeout,
    userAgent: context.userAgent,
  });

  if (response.status !== 200) {
    throw new Error(`Failed to fetch sitemap: HTTP ${response.status}`);
  }

  const nodes = scaffold(response.data);

  if (!hasSitemapIndexNode(nodes)) {
    return extractLocUrls(nodes);
  }

  if (depth >= MAX_SITEMAP_INDEX_DEPTH) {
    context.warnings.push(
      `Sitemap index nesting exceeded ${MAX_SITEMAP_INDEX_DEPTH} levels at ${sitemapUrl}; skipping deeper levels`,
    );
    return [];
  }

  const allUrls: string[] = [];
  for (const childUrl of extractLocUrls(nodes)) {
    try {
      allUrls.push(...(await fetchSitemapUrls(childUrl, context, depth + 1)));
    } catch (error) {
      context.warnings.push(
        `Skipped child sitemap ${childUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  return allUrls;
}

function hasSitemapIndexNode(nodes: XmlNode[]): boolean {
  for (const node of nodes) {
    if (node.xmlTag === "sitemapindex") return true;
    if (node.children && hasSitemapIndexNode(node.children)) return true;
  }
  return false;
}

function extractLocUrls(nodes: XmlNode[]): string[] {
  const urls: string[] = [];
  collectLocText(nodes, urls);
  return urls;
}

function collectLocText(nodes: XmlNode[], urls: string[]): void {
  for (const node of nodes) {
    if (node.xmlTag === "loc" && node.children) {
      const text = node.children
        .filter((c) => c.role === "textLeaf")
        .map((c) => stripCdata(c.raw))
        .join("")
        .trim();
      if (text) urls.push(text);
    }
    if (node.children) collectLocText(node.children, urls);
  }
}

function stripCdata(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("<![CDATA[") && trimmed.endsWith("]]>")) {
    return trimmed.slice(9, -3);
  }
  return trimmed;
}

function computeCategoryAverages(
  urlResults: SitemapUrlResultType[],
): SitemapResultType["categoryAverages"] {
  const successResults = urlResults
    .filter(isSuccessResult)
    .map((r) => r.result);

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
