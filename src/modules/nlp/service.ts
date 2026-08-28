import compromise from "compromise";
import type { ExtractedEntitiesType } from "./schema.js";
import {
  extractAcronymEntities,
  extractTitleCaseEntities,
  isOrganizationByPattern,
  isPersonByHonorific,
  mergeEntityLists,
  smartDedup,
} from "./support/entities.js";
import { extractTopics } from "./support/topics.js";

export { type ExtractedEntitiesType } from "./schema.js";
export { countPatternMatches } from "./support/patterns.js";
export {
  avgSentenceLength,
  computeFleschReadingEase,
  countComplexWords,
} from "./support/readability.js";

export function extractEntities(text: string): ExtractedEntitiesType {
  const doc = compromise(text);

  const compromisePeople = [...new Set(doc.people().out("array") as string[])];
  const compromiseOrgs = [
    ...new Set(doc.organizations().out("array") as string[]),
  ];
  const compromisePlaces = [...new Set(doc.places().out("array") as string[])];

  const acronyms = extractAcronymEntities(text);
  const titleCaseEntities = extractTitleCaseEntities(text);

  const supplementalPeople: string[] = [];
  const supplementalOrgs: string[] = [];
  const unclassified: string[] = [];

  for (const entity of titleCaseEntities) {
    if (isPersonByHonorific(text, entity)) {
      supplementalPeople.push(entity);
    } else if (isOrganizationByPattern(entity)) {
      supplementalOrgs.push(entity);
    } else {
      unclassified.push(entity);
    }
  }

  unclassified.push(...acronyms);

  const people = mergeEntityLists(compromisePeople, supplementalPeople);
  const places = smartDedup([...new Set(compromisePlaces)]);
  const organizations = withoutNamesAlreadyClassified(
    mergeEntityLists(compromiseOrgs, [...supplementalOrgs, ...unclassified]),
    [...people, ...places],
  );

  const topics = extractTopics(doc);

  const imperativeVerbCount = doc.verbs().isImperative().length;
  const numberCount = countWrittenOutNumbers(doc);

  return {
    people,
    organizations,
    places,
    topics,
    imperativeVerbCount,
    numberCount,
  };
}

function withoutNamesAlreadyClassified(
  organizations: string[],
  alreadyClassified: string[],
): string[] {
  const claimed = new Set(alreadyClassified.map((name) => name.toLowerCase()));
  return organizations.filter((org) => !claimed.has(org.toLowerCase()));
}

function countWrittenOutNumbers(doc: ReturnType<typeof compromise>): number {
  return doc.numbers().filter((match) => match.has("#TextValue")).length;
}
