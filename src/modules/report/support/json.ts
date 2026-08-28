import type { AnalyzerResultType } from "../../analyzer/schema.js";
import type { SitemapResultType } from "../../sitemap/schema.js";
import { buildTldr } from "./tldr.js";
import {
  hasHttpUrls,
  HTTP_AUDIT_NOTE,
  SITEMAP_HTTP_AUDIT_NOTE,
} from "./view-model.js";

export function renderJsonTldr(result: AnalyzerResultType): string {
  const tldr = buildTldr(result);
  return JSON.stringify(
    {
      url: result.url,
      overallScore: result.overallScore,
      grade: result.grade,
      tldr,
    },
    null,
    2,
  );
}

export function renderJson(result: AnalyzerResultType): string {
  const notes: string[] = [];
  if (result.url.startsWith("http://")) {
    notes.push(HTTP_AUDIT_NOTE);
  }

  const tldr = buildTldr(result);
  const base = { tldr, ...result };
  const output = notes.length > 0 ? { ...base, notes } : base;
  return JSON.stringify(output, null, 2);
}

export function renderSitemapJson(result: SitemapResultType): string {
  const notes: string[] = [];
  if (hasHttpUrls(result.urlResults)) {
    notes.push(SITEMAP_HTTP_AUDIT_NOTE);
  }

  const output = notes.length > 0 ? { ...result, notes } : result;
  return JSON.stringify(output, null, 2);
}
