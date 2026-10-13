import { normalizeEvaluationDate } from "../../utils/date.js";
import { httpGet, httpProbe, type HttpResponseType } from "../../utils/http.js";
import { normalizeUrl, originOf } from "../../utils/url.js";
import type { DomainSignalsType } from "../audits/schema.js";
import { runAudits } from "../audits/service.js";
import {
  AiseoConfigSchema,
  type AiseoConfigType,
  type AiseoConfigInputType,
} from "../config/schema.js";
import { applyEnginePreset } from "../config/engine-presets.js";
import { extractPage } from "../extractor/service.js";
import type { FetchResultType } from "../fetcher/schema.js";
import { fetchUrl } from "../fetcher/service.js";
import { generateRecommendations } from "../recommendations/service.js";
import { computeScore } from "../scoring/service.js";
import { computeStages } from "../scoring/stages.js";
import { VERSION } from "../../version.js";
import {
  DOMAIN_SIGNAL_TIMEOUT_CAP,
  RESULT_SCHEMA_VERSION,
  SCORING_VERSION,
} from "./constants.js";
import { fingerprint } from "./fingerprint.js";
import { buildFindings } from "../findings/service.js";
import {
  applyLanguageSupport,
  detectPageLanguage,
} from "../audits/language.js";
import {
  AuditSnapshotSchema,
  type AnalyzerOptionsType,
  type AnalyzerResultType,
  type HtmlAnalyzerOptionsType,
  type AuditSnapshotType,
} from "./schema.js";

export async function analyzeUrl(
  options: AnalyzerOptionsType,
  config: AiseoConfigInputType = {},
): Promise<AnalyzerResultType> {
  const startTime = Date.now();
  return buildResult(await captureUrl(options, config), startTime);
}

export function analyzeHtml(
  options: HtmlAnalyzerOptionsType,
  config: AiseoConfigInputType = {},
): AnalyzerResultType {
  const url = normalizeUrl(options.url);
  return buildResult(
    {
      snapshotVersion: 1,
      scoringVersion: SCORING_VERSION,
      url,
      evaluationDate: normalizeEvaluationDate(options.evaluationDate),
      fetchResult: {
        url,
        finalUrl: url,
        html: options.html,
        statusCode: 200,
        contentType: "text/html",
        fetchTimeMs: 0,
        source: "html",
        headers: options.headers,
      },
      domainSignals: options.domainSignals ?? {
        signalsBase: originOf(url),
        robotsTxt: null,
        robotsStatus: "not_checked",
        llmsTxtExists: false,
        llmsFullTxtExists: false,
      },
      config: AiseoConfigSchema.parse(config),
    },
    Date.now(),
  );
}

export async function captureUrl(
  options: AnalyzerOptionsType,
  inputConfig: AiseoConfigInputType = {},
): Promise<AuditSnapshotType> {
  const config = AiseoConfigSchema.parse(inputConfig);
  const url = normalizeUrl(options.url);
  const evaluationDate = normalizeEvaluationDate(options.evaluationDate);
  const timeout = options.timeout ?? config.timeout;
  const userAgent = options.userAgent ?? config.userAgent;
  const fetchResult = await fetchUrl({
    url,
    timeout,
    userAgent,
    signal: options.signal,
  });
  const signalsBase =
    options.signalsBase ?? originOf(fetchResult.finalUrl || url);
  const domainSignals = await fetchDomainSignals(
    signalsBase,
    timeout,
    userAgent,
    options.signal,
  );
  return {
    snapshotVersion: 1,
    scoringVersion: SCORING_VERSION,
    url,
    evaluationDate,
    fetchResult,
    domainSignals,
    config,
  };
}

export function analyzeSnapshot(
  snapshot: AuditSnapshotType,
): AnalyzerResultType {
  const parsed = AuditSnapshotSchema.parse(snapshot);
  if (parsed.scoringVersion !== SCORING_VERSION) {
    throw new Error(
      `Snapshot uses scoring version ${parsed.scoringVersion}; replay requires ${SCORING_VERSION}.`,
    );
  }
  parsed.evaluationDate = normalizeEvaluationDate(parsed.evaluationDate);
  return buildResult(parsed, Date.now());
}

export async function analyzeUrlWithSignals(
  url: string,
  fetchResult: FetchResultType,
  domainSignals: DomainSignalsType,
  config: AiseoConfigType,
  evaluationDate?: string,
): Promise<AnalyzerResultType> {
  return buildResult(
    {
      snapshotVersion: 1,
      scoringVersion: SCORING_VERSION,
      url,
      evaluationDate: normalizeEvaluationDate(evaluationDate),
      fetchResult,
      domainSignals,
      config,
    },
    Date.now(),
  );
}

export async function fetchDomainSignals(
  baseUrl: string,
  timeout: number,
  userAgent: string,
  signal?: AbortSignal,
): Promise<DomainSignalsType> {
  const cappedTimeout = Math.min(timeout, DOMAIN_SIGNAL_TIMEOUT_CAP);
  const signalFileUrl = (file: string) =>
    new URL(file, `${baseUrl.replace(/\/+$/, "")}/`).toString();
  const [robotsRes, llmsRes, llmsFullRes] = await Promise.allSettled([
    httpGet({
      url: signalFileUrl("robots.txt"),
      timeout: cappedTimeout,
      userAgent,
      signal,
    }),
    httpProbe({
      url: signalFileUrl("llms.txt"),
      timeout: cappedTimeout,
      userAgent,
      signal,
    }),
    httpProbe({
      url: signalFileUrl("llms-full.txt"),
      timeout: cappedTimeout,
      userAgent,
      signal,
    }),
  ]);
  signal?.throwIfAborted();
  return {
    signalsBase: baseUrl,
    robotsTxt: robotsTxtContent(robotsRes),
    robotsStatus: robotsStatus(robotsRes),
    llmsTxtExists: isLlmsTxtFound(llmsRes),
    llmsFullTxtExists: isLlmsTxtFound(llmsFullRes),
  };
}

function buildResult(
  snapshot: AuditSnapshotType,
  startTime: number,
): AnalyzerResultType {
  const { url, fetchResult, domainSignals, config, evaluationDate } = snapshot;
  const page = extractPage(fetchResult.html, fetchResult.finalUrl || url);
  const language = detectPageLanguage(page, fetchResult.headers);
  const auditResult = applyLanguageSupport(
    runAudits(page, fetchResult, domainSignals, {
      queries: config.queries,
      domain: config.domain,
      evaluationDate: new Date(evaluationDate),
    }),
    language,
  );
  const stages = computeStages(auditResult.categories, auditResult.rawData, {
    queries: config.queries,
    domain: config.domain,
  });
  const weights = applyEnginePreset(config.weights, config.engine);
  const scoring = computeScore(auditResult.categories, weights, {
    stages,
    stageWeights: config.stageWeights,
  });
  const recommendations = generateRecommendations(auditResult, {
    weights,
    stageWeights: config.stageWeights,
    stages,
    page,
  });
  const findings = buildFindings(page, auditResult, recommendations);
  const warnings: string[] = [];
  if (fetchResult.source === "html")
    warnings.push(
      "Offline HTML input: HTTP fetching was not checked. Domain signals are checked only when supplied.",
    );
  if (domainSignals.robotsStatus === "unavailable")
    warnings.push(
      "robots.txt could not be evaluated. Crawler access is unknown.",
    );
  if (!language.supported)
    warnings.push(
      `Language ${language.code ?? "unknown"}: English-dependent checks were excluded from scoring. This partial score is not comparable with a full English audit.`,
    );

  return {
    url,
    signalsBase: domainSignals.signalsBase,
    analyzedAt: new Date().toISOString(),
    schemaVersion: RESULT_SCHEMA_VERSION,
    overallScore: scoring.overallScore,
    grade: scoring.grade,
    totalPoints: scoring.totalPoints,
    maxPoints: scoring.maxPoints,
    stages,
    categories: auditResult.categories,
    recommendations,
    rawData: auditResult.rawData,
    warnings,
    findings,
    meta: {
      version: VERSION,
      scoringVersion: SCORING_VERSION,
      evaluationDate,
      source: fetchResult.source ?? "network",
      finalUrl: fetchResult.finalUrl || url,
      inputFingerprint: fingerprint({
        url: fetchResult.finalUrl || url,
        html: fetchResult.html,
        status: fetchResult.statusCode,
        source: fetchResult.source ?? "network",
        headers: fetchResult.headers,
        domainSignals,
      }),
      configurationFingerprint: fingerprint({
        weights,
        stageWeights: config.stageWeights,
        queries: config.queries,
        domain: config.domain,
        engine: config.engine,
      }),
      weights: config.weights,
      effectiveWeights: weights,
      stageWeights: config.stageWeights,
      queries: config.queries.length > 0 ? config.queries : undefined,
      domain: config.domain,
      engine: config.engine,
      analysisDurationMs: Date.now() - startTime,
    },
  };
}

function robotsStatus(
  result: PromiseSettledResult<HttpResponseType>,
): DomainSignalsType["robotsStatus"] {
  if (result.status !== "fulfilled") return "unavailable";
  if (result.value.status === 404 || result.value.status === 410)
    return "absent";
  return robotsTxtContent(result) === null ? "unavailable" : "available";
}

function robotsTxtContent(
  result: PromiseSettledResult<HttpResponseType>,
): string | null {
  if (result.status !== "fulfilled" || result.value.status !== 200) return null;
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
