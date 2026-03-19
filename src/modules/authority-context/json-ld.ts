import type { CheerioAPI } from "cheerio";

export function parseJsonLdObjects($: CheerioAPI): Record<string, unknown>[] {
  const objects: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      if (Array.isArray(data)) objects.push(...data);
      else objects.push(data);
    } catch {}
  });
  return objects;
}
