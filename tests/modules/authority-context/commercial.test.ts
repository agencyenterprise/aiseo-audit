import { describe, expect, it } from "vitest";
import { measureCommercialSignals } from "../../../src/modules/authority-context/commercial.js";
import { buildPage } from "../../helpers/page.js";

const filler = (words: number) => "word ".repeat(words).trim();

describe("measureCommercialSignals", () => {
  describe("promotional phrase density", () => {
    it("counts two promotional phrases in a 100 word page as 20 per thousand", () => {
      const page = buildPage(
        `<body><p>${filler(96)} buy now limited time</p></body>`,
      );
      const result = measureCommercialSignals(page);
      expect(result.promotionalPhrasesPerThousandWords).toBe(20);
    });

    it("rounds one phrase in 300 words to 3.3 per thousand", () => {
      const page = buildPage(`<body><p>${filler(298)} buy now</p></body>`);
      const result = measureCommercialSignals(page);
      expect(result.promotionalPhrasesPerThousandWords).toBe(3.3);
    });
  });

  describe("exclamation density", () => {
    it("counts two exclamation marks in a 50 word page as 40 per thousand", () => {
      const page = buildPage(
        `<body><p>${filler(48)} Great! Wonderful!</p></body>`,
      );
      const result = measureCommercialSignals(page);
      expect(result.exclamationsPerThousandWords).toBe(40);
      expect(result.promotionalPhrasesPerThousandWords).toBe(0);
    });
  });

  describe("affiliate link share", () => {
    it("reports a half share when one of two external links is an affiliate link", () => {
      const page = buildPage(
        '<body><p>Comparing gear picks.</p><a href="https://amzn.to/3abc">Grinder</a><a href="https://newspaper.org/story">Review</a></body>',
      );
      const result = measureCommercialSignals(page);
      expect(result.affiliateLinkShare).toBe(0.5);
    });

    it("ignores same site links and spots a tagged affiliate URL", () => {
      const page = buildPage(
        '<body><a href="https://example.com/other">Internal</a><a href="https://retailer.com/item?tag=aff-21">Gadget</a></body>',
      );
      const result = measureCommercialSignals(page);
      expect(result.affiliateLinkShare).toBe(1);
    });

    it("reports zero share when the page links nowhere external", () => {
      const page = buildPage(
        '<body><p>Quiet essay.</p><a href="https://example.com/archive">Archive</a></body>',
      );
      const result = measureCommercialSignals(page);
      expect(result.affiliateLinkShare).toBe(0);
    });
  });

  describe("ad slots", () => {
    it("counts an adsbygoogle unit and an advert class as two slots", () => {
      const page = buildPage(
        '<body><p>Story text.</p><ins class="adsbygoogle"></ins><div class="advert-banner"></div></body>',
      );
      const result = measureCommercialSignals(page);
      expect(result.adSlotCount).toBe(2);
    });
  });

  it("reports zeros across the board for an empty page", () => {
    const page = buildPage("<body></body>");
    expect(measureCommercialSignals(page)).toEqual({
      promotionalPhrasesPerThousandWords: 0,
      exclamationsPerThousandWords: 0,
      affiliateLinkShare: 0,
      adSlotCount: 0,
    });
  });

  it("finds no commercial signals in a plain editorial page", () => {
    const page = buildPage(
      `<body><article><p>${filler(60)}</p></article></body>`,
    );
    expect(measureCommercialSignals(page)).toEqual({
      promotionalPhrasesPerThousandWords: 0,
      exclamationsPerThousandWords: 0,
      affiliateLinkShare: 0,
      adSlotCount: 0,
    });
  });
});
