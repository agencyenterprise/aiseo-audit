import { z } from "zod";

export const auditUrlInputShape = {
  url: z
    .string()
    .describe("The URL to audit. Must be a fully-qualified http or https URL."),
  timeout: z
    .number()
    .optional()
    .describe("Request timeout in milliseconds (default: 45000)."),
};

export const auditUrlConfig = {
  title: "Audit a URL for AI search readiness",
  description:
    "Audit a URL for AI search readiness (how well ChatGPT, Claude, Perplexity, and Gemini can fetch, understand, and cite the page). Returns overall score (0-100), letter grade, 7-category breakdown, and prioritized recommendations. Use when the user asks to check AI SEO, AI search readiness, GEO, or how well a page works with generative engines.",
  inputSchema: auditUrlInputShape,
};

export type AuditUrlArgsType = {
  url: string;
  timeout?: number;
};
