import type { CheerioAPI } from "cheerio";
import { countWords } from "../../utils/strings.js";

export type PronounAmbiguityResultType = {
  paragraphsChecked: number;
  paragraphsOpeningWithPronoun: number;
};

const SUBSTANTIAL_PARAGRAPH_MIN_WORDS = 25;
const OPENS_WITH_PRONOUN_SUBJECT =
  /^(?:it|this|that|these|those|they|he|she)\b/i;

export function measurePronounAmbiguity(
  $: CheerioAPI,
): PronounAmbiguityResultType {
  let paragraphsChecked = 0;
  let paragraphsOpeningWithPronoun = 0;

  $("p").each((_, el) => {
    const paragraph = $(el).text().trim();
    if (countWords(paragraph) <= SUBSTANTIAL_PARAGRAPH_MIN_WORDS) return;

    paragraphsChecked += 1;
    if (OPENS_WITH_PRONOUN_SUBJECT.test(paragraph)) {
      paragraphsOpeningWithPronoun += 1;
    }
  });

  return { paragraphsChecked, paragraphsOpeningWithPronoun };
}
