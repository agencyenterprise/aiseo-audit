import type { AiseoConfigType } from "../../src/modules/config/schema.js";

export function makeConfig(
  overrides: Partial<AiseoConfigType> = {},
): AiseoConfigType {
  return {
    timeout: 45000,
    userAgent: "test",
    format: "pretty",
    weights: {
      contentExtractability: 1,
      structuralAlignment: 1,
      contentStructure: 1,
      answerability: 1,
      queryAlignment: 1,
      entityClarity: 1,
      groundingSignals: 1,
      authorityContext: 1,
      productFit: 1,
      readabilityForCompression: 1,
    },
    historyDir: "./audits",
    queries: [],
    domain: "auto",
    engine: "generic",
    ...overrides,
  };
}
