import { describe, expect, it } from "vitest";
import {
  DEFINITION_PATTERNS,
  DIRECT_ANSWER_PATTERNS,
  QUESTION_HEADING_PATTERN,
  QUESTION_PATTERNS,
  STEP_PATTERNS,
  SUMMARY_MARKERS,
} from "../../../src/modules/answerability/patterns.js";

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
