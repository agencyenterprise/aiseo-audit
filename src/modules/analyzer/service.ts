import { httpGet, httpHead } from "../../utils/http.js";
import { normalizeUrl } from "../../utils/url.js";
import type { DomainSignalsType } from "../audits/schema.js";
import { runAudits } from "../audits/service.js";
import type { AiseoConfigType } from "../config/schema.js";
import { extractPage } from "../extractor/service.js";
import type { FetchResultType } from "../fetcher/schema.js";
import { fetchUrl } from "../fetcher/service.js";
import { generateRecommendations } from "../recommendations/service.js";
import { computeScore } from "../scoring/service.js";
import { DOMAIN_SIGNAL_TIMEOUT_CAP, VERSION } from "./constants.js";
import type { AnalyzerOptionsType, AnalyzerResultType } from "./schema.js";

export async function fetchDomainSignals(
  url: string,
  timeout: number,
  userAgent: string,
): Promise<DomainSignalsType> {
  const cappedTimeout = Math.min(timeout, DOMAIN_SIGNAL_TIMEOUT_CAP);

  const [robotsRes, llmsRes, llmsFullRes] = await Promise.allSettled([
    httpGet({
      url: `${url}/robots.txt`,
      timeout: cappedTimeout,
      userAgent,
    }),
    httpHead({
      url: `${url}/llms.txt`,
      timeout: cappedTimeout,
      userAgent,
    }),
    httpHead({
      url: `${url}/llms-full.txt`,
      timeout: cappedTimeout,
      userAgent,
    }),
  ]);

  return {
    signalsBase: url,
    robotsTxt:
      robotsRes.status === "fulfilled" && robotsRes.value.status === 200
        ? robotsRes.value.data
        : null,
    llmsTxtExists:
      llmsRes.status === "fulfilled" && llmsRes.value.status === 200,
    llmsFullTxtExists:
      llmsFullRes.status === "fulfilled" && llmsFullRes.value.status === 200,
  };
}

function buildResult(
  url: string,
  fetchResult: FetchResultType,
  domainSignals: DomainSignalsType,
  config: AiseoConfigType,
): Omit<AnalyzerResultType, "meta"> & {
  meta: Omit<AnalyzerResultType["meta"], "analysisDurationMs">;
} {
  const page = extractPage(fetchResult.html, url);
  const auditResult = runAudits(page, fetchResult, domainSignals);
  const scoring = computeScore(auditResult.categories, config.weights);
  const recommendations = generateRecommendations(auditResult);

  return {
    url,
    signalsBase: domainSignals.signalsBase,
    analyzedAt: new Date().toISOString(),
    overallScore: scoring.overallScore,
    grade: scoring.grade,
    totalPoints: scoring.totalPoints,
    maxPoints: scoring.maxPoints,
    categories: auditResult.categories,
    recommendations,
    rawData: auditResult.rawData,
    meta: {
      version: VERSION,
    },
  };
}

export async function analyzeUrlWithSignals(
  url: string,
  fetchResult: FetchResultType,
  domainSignals: DomainSignalsType,
  config: AiseoConfigType,
): Promise<AnalyzerResultType> {
  const startTime = Date.now();
  const result = buildResult(url, fetchResult, domainSignals, config);
  return {
    ...result,
    meta: { ...result.meta, analysisDurationMs: Date.now() - startTime },
  };
}

export async function analyzeUrl(
  options: AnalyzerOptionsType,
  config: AiseoConfigType,
): Promise<AnalyzerResultType> {
  const startTime = Date.now();
  const url = normalizeUrl(options.url);
  const timeout = options.timeout ?? config.timeout;
  const userAgent = options.userAgent ?? config.userAgent;

  const fetchResult = await fetchUrl({ url, timeout, userAgent });

  const signalsBase = options.signalsBase ?? fetchResult.finalUrl ?? url;
  const domainSignals = await fetchDomainSignals(
    signalsBase,
    timeout,
    userAgent,
  );

  const result = buildResult(url, fetchResult, domainSignals, config);
  return {
    ...result,
    meta: { ...result.meta, analysisDurationMs: Date.now() - startTime },
  };
}
