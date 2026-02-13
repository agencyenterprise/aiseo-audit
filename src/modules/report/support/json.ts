import type { AnalyzerResultType } from "../../analyzer/schema.js";

export function renderJson(result: AnalyzerResultType): string {
  const notes: string[] = [];
  if (result.url.startsWith("http://")) {
    notes.push(
      "Audited over HTTP. Domain signals (robots.txt, llms.txt) may differ in production.",
    );
  }

  const output = notes.length > 0 ? { ...result, notes } : result;
  return JSON.stringify(output, null, 2);
}
