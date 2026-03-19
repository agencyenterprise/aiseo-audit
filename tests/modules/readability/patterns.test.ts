import { describe, expect, it } from "vitest";
import { TRANSITION_WORDS } from "../../../src/modules/readability/patterns.js";

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
