import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { AnalyzerResultType } from "../modules/analyzer/schema.js";
import { analyzeUrl as defaultAnalyzeUrl } from "../modules/analyzer/service.js";
import type { AiseoConfigType } from "../modules/config/schema.js";
import { loadConfig as defaultLoadConfig } from "../modules/config/service.js";
import type { AuditUrlArgsType } from "./schema.js";

export type AuditUrlDependencies = {
  analyzeUrl: (
    options: { url: string; timeout?: number },
    config: AiseoConfigType,
  ) => Promise<AnalyzerResultType>;
  loadConfig: () => Promise<AiseoConfigType>;
};

const defaultDependencies: AuditUrlDependencies = {
  analyzeUrl: defaultAnalyzeUrl,
  loadConfig: () => defaultLoadConfig(),
};

export async function handleAuditUrl(
  args: AuditUrlArgsType,
  deps: AuditUrlDependencies = defaultDependencies,
): Promise<CallToolResult> {
  try {
    const config = await deps.loadConfig();
    const result = await deps.analyzeUrl(
      { url: args.url, timeout: args.timeout },
      config,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [
        { type: "text", text: `Audit failed for ${args.url}: ${message}` },
      ],
    };
  }
}
