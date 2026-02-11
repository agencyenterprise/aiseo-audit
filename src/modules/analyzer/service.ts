import axios from "axios";
import { getDomain, normalizeUrl } from "../../utils/url.js";
import type { DomainSignalsType } from "../audits/schema.js";
import { runAudits } from "../audits/service.js";
import type { GeoJsonConfig } from "../config/schema.js";
import { extractPage } from "../extractor/service.js";
import { fetchUrl } from "../fetcher/service.js";
import { generateRecommendations } from "../recommendations/service.js";
import { computeScore } from "../scoring/service.js";
import { VERSION } from "./constants.js";
import type { AnalyzerOptionsType, AnalyzerResultType } from "./schema.js";

async function fetchDomainSignals(
  domain: string,
  timeout: number,
  userAgent: string,
): Promise<DomainSignalsType> {
  const baseUrl = `https://${domain}`;

  const [robotsRes, llmsRes, llmsFullRes] = await Promise.allSettled([
    axios.get(`${baseUrl}/robots.txt`, {
      timeout: Math.min(timeout, 5000),
      headers: { "User-Agent": userAgent },
      responseType: "text",
      validateStatus: () => true,
    }),
    axios.head(`${baseUrl}/llms.txt`, {
      timeout: Math.min(timeout, 5000),
      headers: { "User-Agent": userAgent },
      validateStatus: () => true,
    }),
    axios.head(`${baseUrl}/llms-full.txt`, {
      timeout: Math.min(timeout, 5000),
      headers: { "User-Agent": userAgent },
      validateStatus: () => true,
    }),
  ]);

  return {
    robotsTxt:
      robotsRes.status === "fulfilled" && robotsRes.value.status === 200
        ? String(robotsRes.value.data)
        : null,
    llmsTxtExists:
      llmsRes.status === "fulfilled" && llmsRes.value.status === 200,
    llmsFullTxtExists:
      llmsFullRes.status === "fulfilled" && llmsFullRes.value.status === 200,
  };
}

export async function analyzeUrl(
  options: AnalyzerOptionsType,
  config: GeoJsonConfig,
): Promise<AnalyzerResultType> {
  const startTime = Date.now();
  const url = normalizeUrl(options.url);

  // 1. Fetch page
  const timeout = options.timeout ?? config.timeout;
  const userAgent = options.userAgent ?? config.userAgent;

  const fetchResult = await fetchUrl({ url, timeout, userAgent });

  // 2. Fetch domain-level signals (robots.txt, llms.txt, llms-full.txt)
  const domain = getDomain(fetchResult.finalUrl || url);
  const domainSignals = await fetchDomainSignals(domain, timeout, userAgent);

  // 3. Extract
  const page = extractPage(fetchResult.html, url);

  // 4. Audit
  const auditResult = runAudits(page, fetchResult, domainSignals);

  // 5. Score
  const scoring = computeScore(auditResult.categories, config.weights);

  // 6. Recommendations
  const recommendations = generateRecommendations(auditResult);

  const analysisDurationMs = Date.now() - startTime;

  return {
    url,
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
      analysisDurationMs,
    },
  };
}
