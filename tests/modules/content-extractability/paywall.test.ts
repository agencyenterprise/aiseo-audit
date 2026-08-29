import { describe, expect, it } from "vitest";
import { detectPaywallSignals } from "../../../src/modules/content-extractability/paywall.js";
import { buildPage } from "../../helpers/page.js";

const jsonLd = (schema: Record<string, unknown>) =>
  `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;

function detect(html: string) {
  return detectPaywallSignals(buildPage(html).$);
}

describe("detectPaywallSignals", () => {
  describe("structured data access declarations", () => {
    it("reads a boolean isAccessibleForFree false declaration", () => {
      const result = detect(
        `<body><article><p>Premium report.</p></article>${jsonLd({
          "@type": "NewsArticle",
          isAccessibleForFree: false,
        })}</body>`,
      );
      expect(result).toEqual({
        declaresNotFreelyAccessible: true,
        markerCount: 0,
      });
    });

    it("reads the string False as a restricted access declaration", () => {
      const result = detect(
        `<body>${jsonLd({
          "@type": "Article",
          isAccessibleForFree: "False",
        })}</body>`,
      );
      expect(result.declaresNotFreelyAccessible).toBe(true);
    });

    it("finds the declaration nested under hasPart", () => {
      const result = detect(
        `<body>${jsonLd({
          "@type": "WebPage",
          hasPart: {
            "@type": "WebPageElement",
            isAccessibleForFree: "False",
          },
        })}</body>`,
      );
      expect(result.declaresNotFreelyAccessible).toBe(true);
    });

    it("finds the declaration inside a hasPart array", () => {
      const result = detect(
        `<body>${jsonLd({
          "@type": "WebPage",
          hasPart: [
            { "@type": "WebPageElement", isAccessibleForFree: true },
            { "@type": "WebPageElement", isAccessibleForFree: false },
          ],
        })}</body>`,
      );
      expect(result.declaresNotFreelyAccessible).toBe(true);
    });

    it("does not mistake a freely accessible declaration for a paywall", () => {
      const result = detect(
        `<body>${jsonLd({
          "@type": "Article",
          isAccessibleForFree: true,
        })}</body>`,
      );
      expect(result.declaresNotFreelyAccessible).toBe(false);
    });
  });

  describe("DOM markers", () => {
    it("counts a paywall id element", () => {
      const result = detect(
        '<body><p>Teaser text.</p><div id="paywall"></div></body>',
      );
      expect(result).toEqual({
        declaresNotFreelyAccessible: false,
        markerCount: 1,
      });
    });

    it("counts a tinypass modal and a piano element as two markers", () => {
      const result = detect(
        '<body><div class="tp-modal"></div><div class="piano-anon"></div></body>',
      );
      expect(result.markerCount).toBe(2);
    });

    it("counts metered and regwall elements as two markers", () => {
      const result = detect(
        '<body><div class="metered-content"></div><div id="site-regwall"></div></body>',
      );
      expect(result.markerCount).toBe(2);
    });
  });

  describe("body text phrases", () => {
    it("adds exactly one marker even when several paywall phrases appear", () => {
      const result = detect(
        "<body><p>Subscribe to continue.</p><p>Already a subscriber? Sign in here.</p></body>",
      );
      expect(result.markerCount).toBe(1);
    });

    it("stacks a text phrase on top of a DOM marker", () => {
      const result = detect(
        '<body><div id="paywall"></div><p>Subscribe to continue reading.</p></body>',
      );
      expect(result.markerCount).toBe(2);
    });
  });

  it("gives a clean page a clean bill", () => {
    const result = detect(
      "<body><article><p>Everything here stays open and unrestricted.</p></article></body>",
    );
    expect(result).toEqual({
      declaresNotFreelyAccessible: false,
      markerCount: 0,
    });
  });
});
