import type { AnalyzerResultType } from "../../analyzer/schema.js";

export function renderJson(result: AnalyzerResultType): string {
  return JSON.stringify(result, null, 2);
}
