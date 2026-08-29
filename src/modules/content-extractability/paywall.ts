import type { CheerioAPI } from "cheerio";
import { parseJsonLdObjects } from "../extractor/json-ld.js";

export type PaywallSignalsResultType = {
  declaresNotFreelyAccessible: boolean;
  markerCount: number;
};

const PAYWALL_DOM_SELECTORS = [
  "#paywall",
  ".paywall",
  ".tp-modal",
  '[class^="piano-"]',
  '[class*=" piano-"]',
  '[class*="metered"]',
  '[id*="regwall"]',
].join(", ");

const PAYWALL_TEXT_MARKERS =
  /subscribe\s+to\s+continue|sign\s+in\s+to\s+read|to\s+continue\s+reading|already\s+a\s+subscriber/i;

export function detectPaywallSignals($: CheerioAPI): PaywallSignalsResultType {
  return {
    declaresNotFreelyAccessible: jsonLdDeclaresRestrictedAccess($),
    markerCount: domMarkerCount($) + (textMarkerFound($) ? 1 : 0),
  };
}

function jsonLdDeclaresRestrictedAccess($: CheerioAPI): boolean {
  return parseJsonLdObjects($).some(declaresNotFree);
}

function declaresNotFree(schema: Record<string, unknown>): boolean {
  if (isExplicitlyNotFree(schema.isAccessibleForFree)) return true;
  const parts = schema.hasPart;
  const partList = Array.isArray(parts) ? parts : parts ? [parts] : [];
  return partList.some(
    (part) =>
      typeof part === "object" &&
      part !== null &&
      isExplicitlyNotFree(
        (part as Record<string, unknown>).isAccessibleForFree,
      ),
  );
}

function isExplicitlyNotFree(value: unknown): boolean {
  return value === false || value === "False" || value === "false";
}

function domMarkerCount($: CheerioAPI): number {
  return $(PAYWALL_DOM_SELECTORS).length;
}

function textMarkerFound($: CheerioAPI): boolean {
  return PAYWALL_TEXT_MARKERS.test($("body").text());
}
