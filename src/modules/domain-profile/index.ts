import type { ExtractedPageType } from "../extractor/schema.js";
import { parseJsonLdObjects, schemaTypesOf } from "../extractor/json-ld.js";

export type DetectedDomainType = "product" | "informational";

const PRODUCT_SCHEMA_TYPES = new Set(["Product", "Offer", "AggregateOffer"]);
const VISIBLE_PRICE = /[$€£¥]\s?\d[\d,.]*|\d[\d,.]*\s?(?:USD|EUR|GBP)/g;
const CART_VOCABULARY = /\badd\s+to\s+cart\b|\bbuy\s+now\b|\bin\s+stock\b/i;
const PRICE_HITS_SUGGESTING_PRODUCT = 3;

export function detectDomain(
  page: ExtractedPageType,
  requested: "auto" | DetectedDomainType,
): DetectedDomainType {
  if (requested !== "auto") return requested;

  const declaresProductSchema = parseJsonLdObjects(page.$)
    .flatMap(schemaTypesOf)
    .some((type) => PRODUCT_SCHEMA_TYPES.has(type));
  if (declaresProductSchema) return "product";

  const ogType = page.$('meta[property="og:type"]').attr("content") ?? "";
  if (ogType.toLowerCase().includes("product")) return "product";

  const priceHits = page.cleanText.match(VISIBLE_PRICE)?.length ?? 0;
  const sellsDirectly =
    priceHits >= PRICE_HITS_SUGGESTING_PRODUCT &&
    CART_VOCABULARY.test(page.cleanText);
  return sellsDirectly ? "product" : "informational";
}
