import { describe, expect, it } from "vitest";
import { measurePronounAmbiguity } from "../../../src/modules/entity-clarity/pronouns.js";
import { buildPage } from "../../helpers/page.js";

const longParagraph = (opening: string) =>
  `<p>${opening} ${"word ".repeat(26).trim()}</p>`;

function measure(html: string) {
  return measurePronounAmbiguity(buildPage(html).$);
}

describe("measurePronounAmbiguity", () => {
  it("counts one pronoun opener among two substantial paragraphs", () => {
    const result = measure(
      `<body>${longParagraph("It")}${longParagraph("Espresso")}</body>`,
    );
    expect(result).toEqual({
      paragraphsChecked: 2,
      paragraphsOpeningWithPronoun: 1,
    });
  });

  it("counts every substantial paragraph that opens with a pronoun", () => {
    const result = measure(
      `<body>${longParagraph("This")}${longParagraph("They")}</body>`,
    );
    expect(result).toEqual({
      paragraphsChecked: 2,
      paragraphsOpeningWithPronoun: 2,
    });
  });

  it("ignores short paragraphs entirely even when they open with pronouns", () => {
    const result = measure(
      `<body><p>It was fun.</p><p>Those two agreed.</p>${longParagraph(
        "Espresso",
      )}</body>`,
    );
    expect(result).toEqual({
      paragraphsChecked: 1,
      paragraphsOpeningWithPronoun: 0,
    });
  });

  it("skips a paragraph of exactly 25 words", () => {
    const result = measure(`<body><p>${"word ".repeat(25).trim()}</p></body>`);
    expect(result).toEqual({
      paragraphsChecked: 0,
      paragraphsOpeningWithPronoun: 0,
    });
  });

  it("checks a paragraph of 26 words", () => {
    const result = measure(`<body><p>${"word ".repeat(26).trim()}</p></body>`);
    expect(result).toEqual({
      paragraphsChecked: 1,
      paragraphsOpeningWithPronoun: 0,
    });
  });

  it("returns zeros for a page without paragraphs", () => {
    const result = measure("<body><div>plain text container</div></body>");
    expect(result).toEqual({
      paragraphsChecked: 0,
      paragraphsOpeningWithPronoun: 0,
    });
  });
});
