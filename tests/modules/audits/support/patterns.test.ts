import { describe, expect, it } from "vitest";
import {
  AI_CRAWLERS,
  ATTRIBUTION_PATTERNS,
  CITATION_PATTERNS,
  DEFINITION_PATTERNS,
  DIRECT_ANSWER_PATTERNS,
  NUMERIC_CLAIM_PATTERNS,
  QUESTION_HEADING_PATTERN,
  QUESTION_PATTERNS,
  QUOTED_ATTRIBUTION_PATTERNS,
  STEP_PATTERNS,
  SUMMARY_MARKERS,
  TRANSITION_WORDS,
} from "../../../../src/modules/audits/support/patterns.js";

function countMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

describe("DEFINITION_PATTERNS", () => {
  it("matches definition phrases", () => {
    const text =
      "GEO is defined as the optimization of content. It refers to making websites AI-ready.";
    expect(countMatches(text, DEFINITION_PATTERNS)).toBeGreaterThanOrEqual(2);
  });

  it("matches also known as", () => {
    const text = "SEO, also known as Search Engine Optimization";
    expect(countMatches(text, DEFINITION_PATTERNS)).toBeGreaterThanOrEqual(1);
  });
});

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

describe("STEP_PATTERNS", () => {
  it("matches step indicators", () => {
    const text = "Step 1: Do this. Step 2: Do that.";
    expect(countMatches(text, STEP_PATTERNS)).toBeGreaterThanOrEqual(2);
  });

  it("matches ordinal words", () => {
    const text = "First, do this. Secondly, do that. Finally, finish up.";
    expect(countMatches(text, STEP_PATTERNS)).toBeGreaterThanOrEqual(3);
  });

  it("matches how to phrases", () => {
    const text = "Learn how to optimize your website.";
    expect(countMatches(text, STEP_PATTERNS)).toBeGreaterThanOrEqual(1);
  });
});

describe("SUMMARY_MARKERS", () => {
  it("matches summary phrases", () => {
    const text =
      "In summary, the key takeaways are clear. To summarize, we learned a lot.";
    expect(countMatches(text, SUMMARY_MARKERS)).toBeGreaterThanOrEqual(3);
  });

  it("matches conclusion markers", () => {
    const text = "In conclusion, this is the bottom line.";
    expect(countMatches(text, SUMMARY_MARKERS)).toBeGreaterThanOrEqual(2);
  });
});

describe("QUESTION_PATTERNS", () => {
  it("matches question phrases", () => {
    const text =
      "What is GEO? How to optimize content? Why is this important? Who is responsible?";
    expect(countMatches(text, QUESTION_PATTERNS)).toBeGreaterThanOrEqual(4);
  });
});

describe("DIRECT_ANSWER_PATTERNS", () => {
  it("matches direct answer starters at line beginnings", () => {
    const text = "The answer is clear.\nIt is important.\nThis is the key.";
    expect(countMatches(text, DIRECT_ANSWER_PATTERNS)).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("matches simplification phrases", () => {
    const text = "Simply put, this works. In short, it matters.";
    expect(countMatches(text, DIRECT_ANSWER_PATTERNS)).toBeGreaterThanOrEqual(
      2,
    );
  });
});

describe("TRANSITION_WORDS", () => {
  it("contains common transitions", () => {
    expect(TRANSITION_WORDS).toContain("however");
    expect(TRANSITION_WORDS).toContain("therefore");
    expect(TRANSITION_WORDS).toContain("furthermore");
    expect(TRANSITION_WORDS).toContain("for example");
    expect(TRANSITION_WORDS).toContain("on the other hand");
  });

  it("has at least 15 transition words", () => {
    expect(TRANSITION_WORDS.length).toBeGreaterThanOrEqual(15);
  });
});

describe("QUESTION_HEADING_PATTERN", () => {
  it("matches question-style headings", () => {
    expect(QUESTION_HEADING_PATTERN.test("What is GEO")).toBe(true);
    expect(QUESTION_HEADING_PATTERN.test("How to optimize")).toBe(true);
    expect(QUESTION_HEADING_PATTERN.test("Why does this matter")).toBe(true);
    expect(QUESTION_HEADING_PATTERN.test("Can I use this")).toBe(true);
    expect(QUESTION_HEADING_PATTERN.test("Is this effective")).toBe(true);
  });

  it("does not match non-question headings", () => {
    expect(QUESTION_HEADING_PATTERN.test("Introduction")).toBe(false);
    expect(QUESTION_HEADING_PATTERN.test("Getting Started")).toBe(false);
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
