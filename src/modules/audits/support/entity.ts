import type { CheerioAPI } from "cheerio";

export function resolveEntityName($: CheerioAPI): string | null {
  const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim();
  if (ogSiteName) return ogSiteName;

  const jsonLdScripts = $('script[type="application/ld+json"]');
  let orgName: string | null = null;
  jsonLdScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      if (data["@type"] === "Organization" && data.name) {
        orgName = String(data.name).trim();
      }
      if (data.publisher?.name) {
        orgName = orgName || String(data.publisher.name).trim();
      }
    } catch {}
  });

  return orgName || null;
}

export function measureEntityConsistency(
  $: CheerioAPI,
  pageTitle: string,
  entityName: string | null,
): { score: number; surfacesFound: number; surfacesChecked: number } {
  if (!entityName) return { score: 0, surfacesFound: 0, surfacesChecked: 0 };

  const nameLower = entityName.toLowerCase();
  const surfacesChecked = 4;
  let surfacesFound = 0;

  if (pageTitle.toLowerCase().includes(nameLower)) surfacesFound++;

  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  if (ogTitle.toLowerCase().includes(nameLower)) surfacesFound++;

  const footerText = $("footer").text().toLowerCase();
  if (footerText.includes(nameLower)) surfacesFound++;

  const copyrightText = $('[class*="copyright"], [class*="legal"]')
    .text()
    .toLowerCase();
  const headerText = $("header").text().toLowerCase();
  if (copyrightText.includes(nameLower) || headerText.includes(nameLower))
    surfacesFound++;

  const score =
    surfacesFound >= 4
      ? 10
      : surfacesFound >= 3
        ? 7
        : surfacesFound >= 2
          ? 4
          : surfacesFound >= 1
            ? 2
            : 0;

  return { score, surfacesFound, surfacesChecked };
}
