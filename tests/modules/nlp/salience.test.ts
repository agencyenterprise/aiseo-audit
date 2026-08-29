import { describe, expect, it } from "vitest";
import type { ExtractedEntitiesType } from "../../../src/modules/nlp/schema.js";
import {
  coverageOfItems,
  extractSalientTerms,
  textCoversItem,
} from "../../../src/modules/nlp/support/salience.js";

function entitiesWith(
  overrides: Partial<ExtractedEntitiesType>,
): ExtractedEntitiesType {
  return {
    people: [],
    organizations: [],
    places: [],
    topics: [],
    ...overrides,
  };
}

describe("extractSalientTerms", () => {
  it("ranks a term that occurs three times ahead of one that occurs once", () => {
    const text =
      "plain filler words drift along without any particular meaning at all here. " +
      "the falcon flew past the walrus while the falcon circled and the falcon dove.";
    const result = extractSalientTerms(
      text,
      entitiesWith({ topics: ["walrus", "falcon"] }),
    );
    expect(result.terms).toEqual(["falcon", "walrus"]);
  });

  it("boosts an early term over an equally frequent late one", () => {
    const text =
      "penguin sightings opened the morning tour before anything else happened. " +
      "the guides walked the trail for hours and only near the end an otter appeared.";
    const result = extractSalientTerms(
      text,
      entitiesWith({ topics: ["otter", "penguin"] }),
    );
    expect(result.terms).toEqual(["penguin", "otter"]);
  });

  it("drops a candidate that never occurs in the text", () => {
    const text = "the falcon returned to the cliff at dusk.";
    const result = extractSalientTerms(
      text,
      entitiesWith({ topics: ["falcon", "griffin"] }),
    );
    expect(result.terms).toEqual(["falcon"]);
  });

  it("caps the ranked list at ten items", () => {
    const text =
      "badger cheetah dolphin elephant flamingo giraffe hedgehog iguana jaguar koala lemur meerkat";
    const topics = [
      "badger",
      "cheetah",
      "dolphin",
      "elephant",
      "flamingo",
      "giraffe",
      "hedgehog",
      "iguana",
      "jaguar",
      "koala",
      "lemur",
      "meerkat",
    ];
    const result = extractSalientTerms(text, entitiesWith({ topics }));
    expect(result.terms).toHaveLength(10);
    expect(result.terms).not.toContain("meerkat");
  });

  it("ranks people, organizations, and places together by weight", () => {
    const text =
      "Jane Doe met the team at Acme Corp in Berlin before Acme Corp shipped the release.";
    const result = extractSalientTerms(
      text,
      entitiesWith({
        people: ["Jane Doe"],
        organizations: ["Acme Corp"],
        places: ["Berlin"],
      }),
    );
    expect(result.entities).toEqual(["Acme Corp", "Jane Doe", "Berlin"]);
  });

  it("collects percentages, magnitudes, currency, and years without duplicates", () => {
    const text =
      "Revenue grew 45% in 2024 to $1,200 while shipping 3 million units, up 45% overall.";
    const result = extractSalientTerms(text, entitiesWith({}));
    expect(result.numbers).toEqual(["45%", "3 million", "$1,200", "2024"]);
  });
});

describe("textCoversItem", () => {
  it("covers a multi-word entity as whole words regardless of case", () => {
    expect(textCoversItem("The Acme Widgets story", "acme widgets")).toBe(true);
  });

  it("covers the singular form of a plural word through near matching", () => {
    expect(textCoversItem("shop for widgets online", "widget")).toBe(true);
  });

  it("covers a near variant by sliding a window across the field", () => {
    expect(
      textCoversItem("expert contents marketing tips", "content marketing"),
    ).toBe(true);
  });

  it("covers a hyphenated field shorter than the candidate", () => {
    expect(textCoversItem("content-marketing", "content marketing")).toBe(true);
  });

  it("does not cover an unrelated phrase", () => {
    expect(textCoversItem("banana smoothie recipes", "quantum computing")).toBe(
      false,
    );
  });
});

describe("coverageOfItems", () => {
  it("returns the fraction of items the field covers", () => {
    const items = [
      "solar panels",
      "battery packs",
      "quantum computing",
      "medieval castles",
    ];
    expect(coverageOfItems("solar panels and battery packs", items)).toBe(0.5);
  });

  it("returns 1 when every item is covered", () => {
    expect(
      coverageOfItems("Acme Widgets builds batteries", [
        "acme widgets",
        "batteries",
      ]),
    ).toBe(1);
  });

  it("returns 0 for an empty item list", () => {
    expect(coverageOfItems("anything at all", [])).toBe(0);
  });
});
