import type { CheerioAPI } from "cheerio";

const REMOVE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "svg",
  "iframe",
  "nav",
  "header",
  "footer",
  "aside",
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  ".sidebar",
  "#sidebar",
  ".cookie-banner",
  "#cookie-consent",
  ".cookie-notice",
  ".nav",
  ".navbar",
  ".footer",
  ".header",
  ".menu",
  ".ad",
  ".ads",
  ".advertisement",
  '[class*="cookie"]',
  '[class*="consent"]',
  '[class*="popup"]',
  '[class*="modal"]',
];

export function removeBoilerplate($: CheerioAPI): void {
  for (const selector of REMOVE_SELECTORS) {
    $(selector).remove();
  }
}
