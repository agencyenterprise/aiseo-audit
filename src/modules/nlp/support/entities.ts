import {
  ACRONYM_STOPLIST,
  ORG_SUFFIXES,
  PERSON_HONORIFICS,
} from "../constants.js";

export function extractAcronymEntities(text: string): string[] {
  const matches = text.match(/\b[A-Z]{2,6}\b/g);
  if (!matches) return [];

  const seen = new Set<string>();
  const results: string[] = [];
  for (const m of matches) {
    if (!ACRONYM_STOPLIST.has(m) && !seen.has(m)) {
      seen.add(m);
      results.push(m);
    }
  }
  return results;
}

export function extractTitleCaseEntities(text: string): string[] {
  const pattern =
    /\b([A-Z][a-z]+(?:\s+(?:of|the|and|for|de|van|von|al|el|la|le|del|der|den|das|di|du))?\s+(?:[A-Z][a-z]+)(?:\s+[A-Z][a-z]+){0,3})\b/g;

  const sentences = text.split(/[.!?]\s+/);
  const sentenceStarts = new Set<string>();
  for (const s of sentences) {
    const trimmed = s.trim();
    const firstWord = trimmed.split(/\s+/)[0];
    if (firstWord) sentenceStarts.add(firstWord);
  }

  const seen = new Set<string>();
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const entity = match[1];
    const firstWord = entity.split(/\s+/)[0];
    if (
      sentenceStarts.has(firstWord) &&
      !text.includes(`. ${entity}`) &&
      !text.includes(`, ${entity}`)
    ) {
      const escapedEntity = entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const appearances = text.match(new RegExp(escapedEntity, "g"));
      if (!appearances || appearances.length < 2) continue;
    }

    if (!seen.has(entity) && entity.split(/\s+/).length >= 2) {
      seen.add(entity);
      results.push(entity);
    }
  }
  return results;
}

export function isOrganizationByPattern(entity: string): boolean {
  return ORG_SUFFIXES.test(entity);
}

export function isPersonByHonorific(text: string, entity: string): boolean {
  const escapedEntity = entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?:${PERSON_HONORIFICS.source})\\s*${escapedEntity}`,
    "i",
  );
  return pattern.test(text);
}

export function smartDedup(entities: string[]): string[] {
  if (entities.length === 0) return [];

  const sorted = [...entities].sort((a, b) => b.length - a.length);
  const result: string[] = [];
  const lowerSeen = new Set<string>();

  for (const entity of sorted) {
    const lower = entity.toLowerCase();

    if (lowerSeen.has(lower)) continue;

    let isSubstring = false;
    for (const accepted of lowerSeen) {
      if (accepted.includes(lower)) {
        isSubstring = true;
        break;
      }
    }
    if (isSubstring) continue;

    result.push(entity);
    lowerSeen.add(lower);
  }

  return result;
}

export function mergeEntityLists(
  compromiseList: string[],
  supplementalList: string[],
): string[] {
  const combined = [...compromiseList, ...supplementalList];
  return smartDedup(combined);
}
