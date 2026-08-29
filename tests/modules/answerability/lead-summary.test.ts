import { describe, expect, it } from "vitest";
import {
  detectLeadSummary,
  scoreLeadSummary,
} from "../../../src/modules/answerability/lead-summary.js";
import { buildPage } from "../../helpers/page.js";

const INTRO_UNDER_H1 =
  "It is a fact that coffee brewing rewards patience because water temperature grind size and timing all shape the final cup. Brewing at home also saves money and gives full control over every variable in the process.";

const filler = (words: number) => "word ".repeat(words).trim();

function detect(html: string, salientEntities: string[] = []) {
  const page = buildPage(html);
  return detectLeadSummary(page.$, page.cleanText, salientEntities);
}

describe("detectLeadSummary", () => {
  describe("intro paragraph under the H1", () => {
    it("recognizes a 30 to 150 word paragraph sitting directly under the H1", () => {
      const result = detect(
        `<body><h1>Coffee Brewing Guide</h1><p>${INTRO_UNDER_H1}</p></body>`,
      );
      expect(result.hasIntroParagraphUnderH1).toBe(true);
    });

    it("finds the intro even when a wrapper div nests it under the H1", () => {
      const result = detect(
        `<body><h1>Coffee Brewing Guide</h1><div class="lede"><p>${INTRO_UNDER_H1}</p></div></body>`,
      );
      expect(result.hasIntroParagraphUnderH1).toBe(true);
    });

    it("walks past a decorative divider between the H1 and the intro", () => {
      const result = detect(
        `<body><h1>Coffee Brewing Guide</h1><hr><p>${INTRO_UNDER_H1}</p></body>`,
      );
      expect(result.hasIntroParagraphUnderH1).toBe(true);
    });

    it("rejects an intro shorter than 30 words", () => {
      const result = detect(
        "<body><h1>Coffee Brewing Guide</h1><p>Coffee tastes great when brewed with care.</p></body>",
      );
      expect(result.hasIntroParagraphUnderH1).toBe(false);
    });

    it("rejects a page where nothing at all follows the H1", () => {
      const result = detect(
        "<body><p>Stray preamble.</p><h1>Coffee Brewing Guide</h1></body>",
      );
      expect(result.hasIntroParagraphUnderH1).toBe(false);
    });

    it("rejects a page where a section heading interrupts before any paragraph", () => {
      const result = detect(
        `<body><h1>Coffee Brewing Guide</h1><h2>Grinding Basics</h2><p>${INTRO_UNDER_H1}</p></body>`,
      );
      expect(result.hasIntroParagraphUnderH1).toBe(false);
    });
  });

  describe("explicit summary marker", () => {
    it("spots a tl;dr marker inside the first 150 words of clean text", () => {
      const result = detect(
        "<body><h1>Coffee Notes</h1><p>TL;DR: coffee brewing improves with practice and patience.</p></body>",
      );
      expect(result.hasExplicitSummaryMarker).toBe(true);
    });

    it("spots a marker in one of the first two section headings even past the lead window", () => {
      const result = detect(
        `<body><h1>Coffee Brewing Guide</h1><p>${filler(160)}</p><h2>Overview</h2><p>${filler(40)}</p></body>`,
      );
      expect(result.hasExplicitSummaryMarker).toBe(true);
    });

    it("ignores a marker that only surfaces in the third heading beyond the lead window", () => {
      const result = detect(
        `<body><h1>Coffee Brewing Guide</h1><p>${filler(160)}</p><h2>Grinding Basics</h2><h2>Water Chemistry</h2><h2>Summary</h2></body>`,
      );
      expect(result.hasExplicitSummaryMarker).toBe(false);
    });
  });

  describe("first paragraph states the main claim", () => {
    it("credits an opening paragraph that names a salient entity and answers directly", () => {
      const result = detect(
        `<body><h1>Coffee Brewing Guide</h1><p>${INTRO_UNDER_H1}</p></body>`,
        ["coffee"],
      );
      expect(result.firstParagraphStatesMainClaim).toBe(true);
    });

    it("accepts an in short phrase as a direct answer", () => {
      const result = detect(
        "<body><p>Roasters debate origin and blend for hours, yet in short coffee quality depends on freshness above everything else.</p></body>",
        ["coffee"],
      );
      expect(result.firstParagraphStatesMainClaim).toBe(true);
    });

    it("withholds credit when the paragraph never mentions a salient entity", () => {
      const result = detect(
        `<body><h1>Coffee Brewing Guide</h1><p>${INTRO_UNDER_H1}</p></body>`,
        ["quantum entanglement"],
      );
      expect(result.firstParagraphStatesMainClaim).toBe(false);
    });

    it("withholds credit when the entity appears without a direct answer pattern", () => {
      const result = detect(
        "<body><p>Coffee lovers across the globe brew with pour over gear, espresso machines, and cold drip towers depending on season and mood.</p></body>",
        ["coffee"],
      );
      expect(result.firstParagraphStatesMainClaim).toBe(false);
    });
  });

  it("finds nothing on a bare page and scores it zero", () => {
    const result = detect("<body><p>Just a tiny note.</p></body>");
    expect(result).toEqual({
      hasIntroParagraphUnderH1: false,
      hasExplicitSummaryMarker: false,
      firstParagraphStatesMainClaim: false,
    });
    expect(scoreLeadSummary(result)).toBe(0);
  });

  it("earns the full 13 points on a page that leads with a complete summary", () => {
    const result = detect(
      `<body><h1>Coffee Brewing Guide</h1><p>${INTRO_UNDER_H1}</p><h2>Key Takeaways</h2><p>${filler(40)}</p></body>`,
      ["coffee"],
    );
    expect(result).toEqual({
      hasIntroParagraphUnderH1: true,
      hasExplicitSummaryMarker: true,
      firstParagraphStatesMainClaim: true,
    });
    expect(scoreLeadSummary(result)).toBe(13);
  });
});

describe("scoreLeadSummary", () => {
  it("awards 5 points for the intro paragraph alone", () => {
    expect(
      scoreLeadSummary({
        hasIntroParagraphUnderH1: true,
        hasExplicitSummaryMarker: false,
        firstParagraphStatesMainClaim: false,
      }),
    ).toBe(5);
  });

  it("awards 5 points for the explicit summary marker alone", () => {
    expect(
      scoreLeadSummary({
        hasIntroParagraphUnderH1: false,
        hasExplicitSummaryMarker: true,
        firstParagraphStatesMainClaim: false,
      }),
    ).toBe(5);
  });

  it("awards 3 points for stating the main claim alone", () => {
    expect(
      scoreLeadSummary({
        hasIntroParagraphUnderH1: false,
        hasExplicitSummaryMarker: false,
        firstParagraphStatesMainClaim: true,
      }),
    ).toBe(3);
  });

  it("sums to 13 when every signal is present", () => {
    expect(
      scoreLeadSummary({
        hasIntroParagraphUnderH1: true,
        hasExplicitSummaryMarker: true,
        firstParagraphStatesMainClaim: true,
      }),
    ).toBe(13);
  });

  it("sums to 0 when every signal is absent", () => {
    expect(
      scoreLeadSummary({
        hasIntroParagraphUnderH1: false,
        hasExplicitSummaryMarker: false,
        firstParagraphStatesMainClaim: false,
      }),
    ).toBe(0);
  });
});
