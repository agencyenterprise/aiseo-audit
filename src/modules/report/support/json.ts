import type { AnalyzerResultType } from "../../analyzer/schema.js";
import type {
  SitemapResultType,
  SitemapUrlResultType,
} from "../../sitemap/schema.js";
import { buildTldr } from "./tldr.js";

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
    notes.push(
      "Audited over HTTP. Domain signals (robots.txt, llms.txt) may differ in production.",
    );
  }

  const tldr = buildTldr(result);
  const base = { tldr, ...result };
  const output = notes.length > 0 ? { ...base, notes } : base;
  return JSON.stringify(output, null, 2);
}

export function renderSitemapJson(result: SitemapResultType): string {
  const notes: string[] = [];
  const hasHttpUrls = result.urlResults.some(
    (r) =>
      r.status === "success" &&
      (
        r as Extract<SitemapUrlResultType, { status: "success" }>
      ).result.url.startsWith("http://"),
  );
  if (hasHttpUrls) {
    notes.push(
      "Some URLs were audited over HTTP. Domain signals (robots.txt, llms.txt) may differ in production.",
    );
  }

  const output = notes.length > 0 ? { ...result, notes } : result;
  return JSON.stringify(output, null, 2);
}
