import type { ExtractedPageType } from "../extractor/schema.js";
import { STOPWORDS } from "../nlp/constants.js";
import { buildCategoryOutput } from "./category.js";
import type {
  AuditRawDataType,
  AuditResultType,
  CategoryNameType,
} from "./schema.js";

const ENGLISH_CATEGORIES = new Set<CategoryNameType>([
  "structuralAlignment",
  "answerability",
  "queryAlignment",
  "entityClarity",
  "readabilityForCompression",
]);
const ENGLISH_FACTORS = new Set([
  "Citation Patterns",
  "Numeric Claims",
  "Attribution Indicators",
  "Quoted Attribution",
  "Hedged Language",
  "Contact/About Links",
  "Content Freshness",
  "Topic Time Sensitivity",
  "Promotional Language",
  "Site Type",
  "Comparison Content",
]);

export function detectPageLanguage(
  page: ExtractedPageType,
  headers: Record<string, string> = {},
): NonNullable<AuditRawDataType["language"]> {
  const declared = page.$("html").attr("lang")?.trim();
  if (declared) return languageRecord(declared, "html");
  const header = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === "content-language",
  )?.[1];
  if (header) return languageRecord(header.split(",")[0].trim(), "header");
  const words = page.cleanText.toLowerCase().match(/\p{L}+/gu) ?? [];
  const englishWords = words.filter((word) => STOPWORDS.has(word)).length;
  const hasEnglishEvidence =
    words.length >= 8 &&
    englishWords >= 3 &&
    englishWords / words.length >= 0.12;
  return {
    code: hasEnglishEvidence ? "en" : null,
    source: hasEnglishEvidence ? "inferred" : "unknown",
    supported: hasEnglishEvidence,
  };
}

export function applyLanguageSupport(
  audit: AuditResultType,
  language: NonNullable<AuditRawDataType["language"]>,
): AuditResultType {
  if (language.supported)
    return { ...audit, rawData: { ...audit.rawData, language } };
  const categories = Object.fromEntries(
    Object.entries(audit.categories).map(([key, category]) => {
      const factors = category.factors.map((factor) =>
        ENGLISH_CATEGORIES.has(category.key) || ENGLISH_FACTORS.has(factor.name)
          ? {
              ...factor,
              status: "neutral" as const,
              score: 0,
              value: `Not evaluated: English analysis is not validated for ${language.code ?? "an unknown language"}.`,
            }
          : factor,
      );
      return [key, buildCategoryOutput(category.key, factors).category];
    }),
  );
  const rawData = { ...audit.rawData, language };
  delete rawData.queryAlignment;
  delete rawData.readabilityScore;
  delete rawData.avgSentenceLength;
  return { categories, rawData };
}

function languageRecord(
  tag: string,
  source: "html" | "header",
): NonNullable<AuditRawDataType["language"]> {
  const code = tag.toLowerCase().split(/[-_]/)[0];
  return { code, source, supported: code === "en" };
}
