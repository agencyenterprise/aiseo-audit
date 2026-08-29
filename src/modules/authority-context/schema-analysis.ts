import { schemaTypesOf } from "../extractor/json-ld.js";

const PROPERTIES_ENGINES_EXPECT_PER_TYPE: Record<string, string[]> = {
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
    const type = firstRecognizedTypeOf(schema);
    if (!type) continue;
    const requiredProps = PROPERTIES_ENGINES_EXPECT_PER_TYPE[type];

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

function firstRecognizedTypeOf(
  schema: Record<string, unknown>,
): string | undefined {
  return schemaTypesOf(schema).find(
    (type) => PROPERTIES_ENGINES_EXPECT_PER_TYPE[type],
  );
}
