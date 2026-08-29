import { z } from "zod";

export const auditUrlInputShape = {
  url: z
    .string()
    .describe(
      "The URL to audit. A bare domain like example.com is accepted; https:// is assumed when the scheme is omitted.",
    ),
  timeout: z
    .number()
    .optional()
    .describe("Request timeout in milliseconds (default: 45000)."),
  queries: z
    .array(z.string())
    .max(10)
    .optional()
    .describe(
      "Target queries the page should answer (max 10; about 5 gives stable coverage measurement). Enables query-alignment scoring.",
    ),
  domain: z
    .enum(["auto", "product", "informational"])
    .optional()
    .describe(
      "Page domain profile. Product pages get product-fit checks (price, specs, comparisons). Default: auto-detect.",
    ),
};

export const auditUrlConfig = {
  title: "Audit a URL for AI search readiness",
  description:
    "Audit a URL for AI search readiness (how well ChatGPT, Claude, Perplexity, and Gemini can fetch, understand, and cite the page). Returns an overall score (0-100) with a letter grade, pipeline-stage scores (technical eligibility gate, retrieval alignment, citation fitness with evidence gates, provenance), evidence-tiered factors, and prioritized recommendations. Scoring is a research-informed heuristic audit, not a citation-probability predictor. Use when the user asks to check AI SEO, AI search readiness, GEO, or how well a page works with generative engines. Scoring weights come from an aiseo.config.json discovered relative to the MCP server's working directory, or defaults when none exists.",
  inputSchema: auditUrlInputShape,
};

const auditUrlArgsSchema = z.object(auditUrlInputShape);
export type AuditUrlArgsType = z.infer<typeof auditUrlArgsSchema>;
