const SCHEMA_REQUIRED_PROPERTIES: Record<string, string[]> = {
  Article: ["headline", "author", "datePublished"],
  NewsArticle: ["headline", "author", "datePublished"],
  BlogPosting: ["headline", "author", "datePublished"],
  FAQPage: ["mainEntity"],
  HowTo: ["name", "step"],
  Organization: ["name", "url"],
  LocalBusiness: ["name", "address"],
  Product: ["name"],
  WebPage: ["name"],
};

export function evaluateSchemaCompleteness(
  schemas: Record<string, unknown>[],
): {
  totalTypes: number;
  avgCompleteness: number;
  details: Array<{ type: string; present: string[]; missing: string[] }>;
} {
  const details: Array<{
    type: string;
    present: string[];
    missing: string[];
  }> = [];

  for (const schema of schemas) {
    const type = String(schema["@type"] || "");
    const requiredProps = SCHEMA_REQUIRED_PROPERTIES[type];
    if (!requiredProps) continue;

    const present = requiredProps.filter((prop) => schema[prop] != null);
    const missing = requiredProps.filter((prop) => schema[prop] == null);
    details.push({ type, present, missing });
  }

  const avgCompleteness =
    details.length > 0
      ? details.reduce(
          (sum, d) =>
            sum + d.present.length / (d.present.length + d.missing.length),
          0,
        ) / details.length
      : 0;

  return { totalTypes: details.length, avgCompleteness, details };
}
