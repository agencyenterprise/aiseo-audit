import { describe, expect, it } from "vitest";
import {
  countSentences,
  countSyllables,
  countWords,
  truncate,
} from "../../src/utils/strings.js";

describe("countWords", () => {
  it("counts words in text", () => {
    expect(countWords("Hello world")).toBe(2);
    expect(countWords("One two three four five")).toBe(5);
  });

  it("handles multiple spaces", () => {
    expect(countWords("Hello    world")).toBe(2);
  });

  it("returns 0 for empty text", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });
});

describe("countSentences", () => {
  it("counts sentences ending with periods", () => {
    expect(countSentences("Hello world. How are you. Fine thanks.")).toBe(3);
  });

  it("counts sentences ending with different punctuation", () => {
    expect(countSentences("Hello there! How are you doing? I am doing fine.")).toBe(3);
  });

  it("ignores very short segments", () => {
    expect(countSentences("Dr. Smith went home. He was tired.")).toBe(2);
  });

  it("returns 0 for empty text", () => {
    expect(countSentences("")).toBe(0);
  });
});

describe("countSyllables", () => {
  it("counts syllables in simple words", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("hello")).toBe(2);
    expect(countSyllables("beautiful")).toBe(4);
  });

  it("handles silent e", () => {
    expect(countSyllables("make")).toBe(1);
    expect(countSyllables("code")).toBe(1);
  });

  it("returns 1 for very short words", () => {
    expect(countSyllables("a")).toBe(1);
    expect(countSyllables("I")).toBe(1);
  });

  it("handles complex words", () => {
    expect(countSyllables("implementation")).toBeGreaterThanOrEqual(4);
    expect(countSyllables("methodology")).toBeGreaterThanOrEqual(4);
  });
});

describe("truncate", () => {
  it("returns original string if under limit", () => {
    expect(truncate("Hello", 10)).toBe("Hello");
    expect(truncate("Hello", 5)).toBe("Hello");
  });

  it("truncates and adds ellipsis", () => {
    expect(truncate("Hello world", 8)).toBe("Hello...");
    expect(truncate("This is a long string", 10)).toBe("This is...");
  });

  it("handles edge cases", () => {
    expect(truncate("Hi", 3)).toBe("Hi");
    expect(truncate("Hello", 3)).toBe("...");
  });
});
