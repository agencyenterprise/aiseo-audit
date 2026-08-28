import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { extractCleanText } from "../../../src/modules/extractor/support/text.js";
import { countPatternMatches } from "../../../src/modules/nlp/service.js";
import {
  DIRECT_ANSWER_PATTERNS,
  STEP_PATTERNS,
} from "../../../src/modules/answerability/patterns.js";

function cleanTextOf(html: string): string {
  return extractCleanText(cheerio.load(html));
}

describe("patterns against real extractCleanText output", () => {
  it("counts direct answer statements at sentence starts mid-document", () => {
    const text = cleanTextOf(`<html><body>
      <p>Some introductory paragraph to push content down.</p>
      <p>The answer is simple. It is a matter of structure.</p>
      <p>This is the key point. They are all connected.</p>
    </body></html>`);

    expect(text).not.toContain("\n");
    expect(countPatternMatches(text, DIRECT_ANSWER_PATTERNS)).toBe(4);
  });

  it("counts literal numbered steps mid-document", () => {
    const text = cleanTextOf(`<html><body>
      <p>Follow this process carefully.</p>
      <p>1. Install the package 2. Configure the settings 3. Run the audit</p>
    </body></html>`);

    const numberedStepPattern = STEP_PATTERNS[1];
    expect(text.match(numberedStepPattern)?.length).toBe(3);
  });

  it("does not count decimals as numbered steps", () => {
    const text = cleanTextOf(
      `<html><body><p>It costs $3.5 million or 2.4 percent.</p></body></html>`,
    );

    const numberedStepPattern = STEP_PATTERNS[1];
    expect(text.match(numberedStepPattern)).toBeNull();
  });
});
