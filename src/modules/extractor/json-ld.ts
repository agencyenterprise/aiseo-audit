import type { CheerioAPI } from "cheerio";

const MAX_NESTED_GRAPH_DEPTH = 3;

function flatten(
  data: unknown,
  objects: Record<string, unknown>[],
  depth: number,
): void {
  if (Array.isArray(data)) {
    for (const item of data) flatten(item, objects, depth);
    return;
  }
  if (data === null || typeof data !== "object") return;

  const record = data as Record<string, unknown>;
  objects.push(record);
  flattenGraphEnvelope(record, objects, depth);
}

function flattenGraphEnvelope(
  record: Record<string, unknown>,
  objects: Record<string, unknown>[],
  depth: number,
): void {
  if (!Array.isArray(record["@graph"])) return;
  if (depth >= MAX_NESTED_GRAPH_DEPTH) return;
  for (const item of record["@graph"]) flatten(item, objects, depth + 1);
}

export function parseJsonLdObjects($: CheerioAPI): Record<string, unknown>[] {
  const objects: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      flatten(JSON.parse($(el).html() || "{}"), objects, 0);
    } catch {}
  });
  return objects;
}

export function schemaTypesOf(schema: Record<string, unknown>): string[] {
  const type = schema["@type"];
  if (typeof type === "string") return [type];
  if (Array.isArray(type)) {
    return type.filter((t): t is string => typeof t === "string");
  }
  return [];
}
