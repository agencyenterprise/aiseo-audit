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
];

const BOILERPLATE_WORDS = new Set([
  "cookie",
  "cookies",
  "consent",
  "gdpr",
  "popup",
  "modal",
  "overlay",
]);

const GENERIC_UI_QUALIFIERS = new Set([
  "banner",
  "bar",
  "notice",
  "dialog",
  "wall",
  "policy",
  "message",
  "alert",
  "box",
  "container",
  "wrapper",
  "backdrop",
  "inner",
  "outer",
  "body",
  "content",
  "close",
  "btn",
  "button",
  "fixed",
  "sticky",
]);

export function removeBoilerplate($: CheerioAPI): void {
  $(REMOVE_SELECTORS.join(",")).remove();
  removeElementsNamedAsBoilerplateUi($);
}

function removeElementsNamedAsBoilerplateUi($: CheerioAPI): void {
  $("[class]").each((_, el) => {
    const classTokens = ($(el).attr("class") ?? "")
      .split(/\s+/)
      .filter(Boolean);
    if (classTokens.some(namesOnlyBoilerplateUi)) {
      $(el).remove();
    }
  });
}

function namesOnlyBoilerplateUi(classToken: string): boolean {
  const words = wordsOfClassToken(classToken);
  if (words.length === 0) return false;
  return (
    words.some((word) => BOILERPLATE_WORDS.has(word)) &&
    words.every(
      (word) => BOILERPLATE_WORDS.has(word) || GENERIC_UI_QUALIFIERS.has(word),
    )
  );
}

function wordsOfClassToken(classToken: string): string[] {
  return classToken
    .split(/[-_]|(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .filter(Boolean);
}
