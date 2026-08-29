import type { ExtractedPageType } from "../extractor/schema.js";
import { countWords } from "../../utils/strings.js";

export type CommercialSignalsResultType = {
  promotionalPhrasesPerThousandWords: number;
  exclamationsPerThousandWords: number;
  affiliateLinkShare: number;
  adSlotCount: number;
};

const PROMOTIONAL_PHRASES = [
  /\bbest\s+ever\b/gi,
  /\brevolutionary\b/gi,
  /\bgame[-\s]chang(?:er|ing)\b/gi,
  /\b#1\b/g,
  /\bworld[-\s]class\b/gi,
  /\bindustry[-\s]leading\b/gi,
  /\baward[-\s]winning\b/gi,
  /\bunbeatable\b/gi,
  /\bmust[-\s]have\b/gi,
  /\bwe\s+offer\b/gi,
  /\bour\s+(?:award[-\s]winning|amazing|incredible|exclusive)\b/gi,
  /\bbuy\s+now\b/gi,
  /\bshop\s+now\b/gi,
  /\border\s+today\b/gi,
  /\bsign\s+up\s+(?:today|now|free)\b/gi,
  /\blimited\s+time\b/gi,
  /\bact\s+now\b/gi,
  /\bdon'?t\s+miss\b/gi,
  /\bget\s+started\s+free\b/gi,
  /\bexclusive\s+(?:deal|offer|discount)\b/gi,
  /\bhurry\b/gi,
  /\bwhile\s+supplies\s+last\b/gi,
  /\bfree\s+shipping\b/gi,
  /\bmoney[-\s]back\s+guarantee\b/gi,
  /\bno\s+obligation\b/gi,
  /\brisk[-\s]free\b/gi,
  /\bclick\s+here\b/gi,
  /\bsubscribe\s+(?:today|now)\b/gi,
  /\bjoin\s+(?:today|now|free)\b/gi,
  /\bclaim\s+your\b/gi,
  /\bunlock\b/gi,
  /\bsupercharge\b/gi,
  /\bskyrocket\b/gi,
  /\btransform\s+your\b/gi,
  /\bultimate\s+guide\s+to\s+buying\b/gi,
  /\blowest\s+price\b/gi,
  /\bbiggest\s+sale\b/gi,
  /\bsave\s+big\b/gi,
  /\btop[-\s]rated\b/gi,
  /\bfive[-\s]star\b/gi,
];

const AFFILIATE_URL_MARKERS =
  /amzn\.to|\/ref=|[?&]tag=|[?&]affid=|afftrack|shareasale|awin1|clickbank|go\.skimresources|redirectingat|[?&]utm_medium=affiliate/i;

const AD_SLOT_SELECTORS = [
  "ins.adsbygoogle",
  '[id*="ad-slot"]',
  '[class*="advert"]',
  "[data-ad]",
  '[id*="taboola"]',
  ".sponsored",
  '[class*="promo-banner"]',
].join(", ");

export function measureCommercialSignals(
  page: ExtractedPageType,
): CommercialSignalsResultType {
  const words = countWords(page.cleanText);
  const perThousand = (count: number) =>
    words > 0 ? Math.round((count / words) * 1000 * 10) / 10 : 0;

  const promotionalHits = PROMOTIONAL_PHRASES.reduce(
    (total, phrase) => total + (page.cleanText.match(phrase)?.length ?? 0),
    0,
  );
  const exclamations = page.cleanText.match(/!/g)?.length ?? 0;

  const affiliateLinks = page.externalLinks.filter((link) =>
    AFFILIATE_URL_MARKERS.test(link.url),
  ).length;
  const affiliateLinkShare =
    page.externalLinks.length > 0
      ? affiliateLinks / page.externalLinks.length
      : 0;

  return {
    promotionalPhrasesPerThousandWords: perThousand(promotionalHits),
    exclamationsPerThousandWords: perThousand(exclamations),
    affiliateLinkShare,
    adSlotCount: page.$(AD_SLOT_SELECTORS).length,
  };
}
