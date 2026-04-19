import { describe, expect, it } from "vitest";
import { extractQuestions } from "../../../src/modules/answerability/questions.js";

describe("extractQuestions", () => {
  it("extracts a simple interrogative question", () => {
    expect(extractQuestions("What is SEO?")).toEqual(["What is SEO?"]);
  });

  it("extracts multiple questions from a paragraph", () => {
    const text = "What is SEO? How does it work? Why should I care?";
    expect(extractQuestions(text)).toEqual([
      "What is SEO?",
      "How does it work?",
      "Why should I care?",
    ]);
  });

  it("does not greedily absorb unrelated preceding text", () => {
    // Regression: text extracted from multiple concatenated headings used to
    // produce a single garbled "question" spanning all of them.
    const text =
      "The AE Team We help global teams turn AI curiosity into shipped systems What are you working on?";
    expect(extractQuestions(text)).toEqual(["What are you working on?"]);
  });

  it("ignores non-question text that ends in ?", () => {
    const text = "Something went wrong with the request at this URL?";
    // Starts with a non-interrogative so it is dropped.
    expect(extractQuestions(text)).toEqual([]);
  });

  it("caps each question at 160 characters", () => {
    const longPrefix = "really ".repeat(30);
    const text = `What is ${longPrefix}important here?`;
    expect(extractQuestions(text)).toEqual([]);
  });

  it("is case-insensitive on the interrogative lead", () => {
    expect(extractQuestions("how do I start?")).toEqual(["how do I start?"]);
  });
});
