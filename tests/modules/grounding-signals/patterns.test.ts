import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_PATTERNS,
  CITATION_PATTERNS,
  NUMERIC_CLAIM_PATTERNS,
  QUOTED_ATTRIBUTION_PATTERNS,
} from "../../../src/modules/grounding-signals/patterns.js";

function countMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

describe("CITATION_PATTERNS", () => {
  it("matches bracketed citations", () => {
    const text =
      "Research shows positive results [1] and further evidence [2].";
    expect(countMatches(text, CITATION_PATTERNS)).toBeGreaterThanOrEqual(2);
  });

  it("matches parenthetical citations", () => {
    const text = "Studies indicate (Smith, 2024) that this is effective.";
    expect(countMatches(text, CITATION_PATTERNS)).toBeGreaterThanOrEqual(1);
  });

  it("matches attribution phrases", () => {
    const text =
      "According to research, the data from studies show improvement.";
    expect(countMatches(text, CITATION_PATTERNS)).toBeGreaterThanOrEqual(2);
  });
});

describe("ATTRIBUTION_PATTERNS", () => {
  it("matches attribution verbs", () => {
    const text =
      "According to experts, he said it was true. She stated the facts and reported findings.";
    expect(countMatches(text, ATTRIBUTION_PATTERNS)).toBeGreaterThanOrEqual(4);
  });
});

describe("NUMERIC_CLAIM_PATTERNS", () => {
  it("matches percentages", () => {
    const text = "The rate increased by 25% and then decreased by 10.5%";
    expect(countMatches(text, NUMERIC_CLAIM_PATTERNS)).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("matches large numbers", () => {
    const text = "Over 5 million users and $1,000 in revenue";
    expect(countMatches(text, NUMERIC_CLAIM_PATTERNS)).toBeGreaterThanOrEqual(
      2,
    );
  });
});

describe("QUOTED_ATTRIBUTION_PATTERNS", () => {
  it("matches quotes with attribution", () => {
    const text1 = '"The future is AI" - John Smith';
    const text2 = '"This is important," said Jane';

    expect(
      countMatches(text1, QUOTED_ATTRIBUTION_PATTERNS),
    ).toBeGreaterThanOrEqual(1);
    expect(
      countMatches(text2, QUOTED_ATTRIBUTION_PATTERNS),
    ).toBeGreaterThanOrEqual(1);
  });
});
