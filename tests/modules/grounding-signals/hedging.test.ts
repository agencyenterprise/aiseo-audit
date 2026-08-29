import { describe, expect, it } from "vitest";
import { measureHedging } from "../../../src/modules/grounding-signals/hedging.js";

describe("measureHedging", () => {
  it("finds two hedged sentences among four and reports an exact half share", () => {
    const text =
      "The bridge opened in June. It may rain during the ceremony. Engineers tested the design twice. The results possibly reflect sensor drift.";
    expect(measureHedging(text)).toEqual({
      sentenceCount: 4,
      hedgedSentenceCount: 2,
      hedgedShare: 0.5,
    });
  });

  it("returns zeros for an empty string", () => {
    expect(measureHedging("")).toEqual({
      sentenceCount: 0,
      hedgedSentenceCount: 0,
      hedgedShare: 0,
    });
  });

  it("detects the multi word hedge phrase in my opinion", () => {
    expect(measureHedging("In my opinion the committee erred.")).toEqual({
      sentenceCount: 1,
      hedgedSentenceCount: 1,
      hedgedShare: 1,
    });
  });

  it("does not treat the lone word opinion as a hedge", () => {
    expect(
      measureHedging("Everyone voiced an opinion during the meeting."),
    ).toEqual({
      sentenceCount: 1,
      hedgedSentenceCount: 0,
      hedgedShare: 0,
    });
  });

  it("leaves a confident text with no hedges untouched", () => {
    const text =
      "Paris is the capital of France. The Eiffel Tower stands in Paris. Water freezes at zero degrees Celsius.";
    expect(measureHedging(text)).toEqual({
      sentenceCount: 3,
      hedgedSentenceCount: 0,
      hedgedShare: 0,
    });
  });

  it("drops fragments of five characters or fewer before counting", () => {
    expect(measureHedging("Go on. The evidence suggests a pattern.")).toEqual({
      sentenceCount: 1,
      hedgedSentenceCount: 1,
      hedgedShare: 1,
    });
  });
});
