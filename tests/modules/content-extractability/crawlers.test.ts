import { describe, expect, it } from "vitest";
import { AI_CRAWLERS } from "../../../src/modules/content-extractability/robots.js";

describe("AI_CRAWLERS", () => {
  it("contains major AI crawlers", () => {
    expect(AI_CRAWLERS).toContain("GPTBot");
    expect(AI_CRAWLERS).toContain("ClaudeBot");
    expect(AI_CRAWLERS).toContain("PerplexityBot");
    expect(AI_CRAWLERS).toContain("Google-Extended");
  });

  it("has at least 5 crawlers", () => {
    expect(AI_CRAWLERS.length).toBeGreaterThanOrEqual(5);
  });
});
