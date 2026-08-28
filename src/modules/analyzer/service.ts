import { httpGet, httpProbe, type HttpResponseType } from "../../utils/http.js";
import { normalizeUrl, originOf } from "../../utils/url.js";
import type { DomainSignalsType } from "../audits/schema.js";
import { runAudits } from "../audits/service.js";
import type { AiseoConfigType } from "../config/schema.js";
import { extractPage } from "../extractor/service.js";
import type { FetchResultType } from "../fetcher/schema.js";
import { fetchUrl } from "../fetcher/service.js";
import { generateRecommendations } from "../recommendations/service.js";
import { computeScore } from "../scoring/service.js";
import { VERSION } from "../../version.js";
import { DOMAIN_SIGNAL_TIMEOUT_CAP } from "./constants.js";
import type { AnalyzerOptionsType, AnalyzerResultType } from "./schema.js";

export async function analyzeUrl(
  options: AnalyzerOptionsType,
  config: AiseoConfigType,
): Promise<AnalyzerResultType> {
  const startTime = Date.now();
  const url = normalizeUrl(options.url);
  const timeout = options.timeout ?? config.timeout;
  const userAgent = options.userAgent ?? config.userAgent;

  const fetchResult = await fetchUrl({ url, timeout, userAgent });

  const signalsBase =
    options.signalsBase ?? originOf(fetchResult.finalUrl ?? url);
  const domainSignals = await fetchDomainSignals(
    signalsBase,
    timeout,
    userAgent,
  );

  return buildResult(url, fetchResult, domainSignals, config, startTime);
}

export async function analyzeUrlWithSignals(
  url: string,
  fetchResult: FetchResultType,
  domainSignals: DomainSignalsType,
  config: AiseoConfigType,
): Promise<AnalyzerResultType> {
  return buildResult(url, fetchResult, domainSignals, config, Date.now());
}

export async function fetchDomainSignals(
  baseUrl: string,
  timeout: number,
  userAgent: string,
): Promise<DomainSignalsType> {
  const cappedTimeout = Math.min(timeout, DOMAIN_SIGNAL_TIMEOUT_CAP);
  const signalFileUrl = (file: string) =>
    new URL(file, `${baseUrl.replace(/\/+$/, "")}/`).toString();

  const [robotsRes, llmsRes, llmsFullRes] = await Promise.allSettled([
    httpGet({
      url: signalFileUrl("robots.txt"),
      timeout: cappedTimeout,
      userAgent,
    }),
    httpProbe({
      url: signalFileUrl("llms.txt"),
      timeout: cappedTimeout,
      userAgent,
    }),
    httpProbe({
      url: signalFileUrl("llms-full.txt"),
      timeout: cappedTimeout,
      userAgent,
    }),
  ]);

  return {
    signalsBase: baseUrl,
    robotsTxt: robotsTxtContent(robotsRes),
    llmsTxtExists: isLlmsTxtFound(llmsRes),
    llmsFullTxtExists: isLlmsTxtFound(llmsFullRes),
  };
}

function buildResult(
  url: string,
  fetchResult: FetchResultType,
  domainSignals: DomainSignalsType,
  config: AiseoConfigType,
  startTime: number,
): AnalyzerResultType {
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
      weights: config.weights,
      analysisDurationMs: Date.now() - startTime,
    },
  };
}

function robotsTxtContent(
  result: PromiseSettledResult<HttpResponseType>,
): string | null {
  if (result.status !== "fulfilled" || result.value.status !== 200) {
    return null;
  }
  const { headers = {}, data = "" } = result.value;
  return isSpaShellServedAsPlainFile(headers, data) ? null : data;
}

function isLlmsTxtFound(
  result: PromiseSettledResult<HttpResponseType>,
): boolean {
  if (result.status !== "fulfilled") return false;
  const { status, headers = {}, data = "" } = result.value;
  if (status !== 200 && status !== 206) return false;
  return !isSpaShellServedAsPlainFile(headers, data);
}

function isSpaShellServedAsPlainFile(
  headers: Record<string, string>,
  data: string,
): boolean {
  const contentType = (headers["content-type"] ?? "").toLowerCase();
  if (contentType.includes("text/html")) return true;
  const bodyStart = data.slice(0, 256).toLowerCase();
  return bodyStart.includes("<!doctype html") || bodyStart.includes("<html");
}
