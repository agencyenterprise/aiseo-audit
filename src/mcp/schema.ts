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
};

export const auditUrlConfig = {
  title: "Audit a URL for AI search readiness",
  description:
    "Audit a URL for AI search readiness (how well ChatGPT, Claude, Perplexity, and Gemini can fetch, understand, and cite the page). Returns overall score (0-100), letter grade, 7-category breakdown, and prioritized recommendations. Use when the user asks to check AI SEO, AI search readiness, GEO, or how well a page works with generative engines. Scoring weights come from an aiseo.config.json discovered relative to the MCP server's working directory, or defaults when none exists.",
  inputSchema: auditUrlInputShape,
};

const auditUrlArgsSchema = z.object(auditUrlInputShape);
export type AuditUrlArgsType = z.infer<typeof auditUrlArgsSchema>;
