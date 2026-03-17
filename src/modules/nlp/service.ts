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
import { extractTopicsByTfIdf } from "./support/topics.js";

export { type ExtractedEntitiesType } from "./schema.js";
export {
  countPatternMatches,
  countTransitionWords,
} from "./support/patterns.js";
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
  const organizations = mergeEntityLists(compromiseOrgs, [
    ...supplementalOrgs,
    ...unclassified,
  ]);
  const places = smartDedup([...new Set(compromisePlaces)]);

  const topics = extractTopicsByTfIdf(doc);

  const imperativeVerbCount = doc.verbs().isImperative().length;
  const numberCount = doc.numbers().length;

  return {
    people,
    organizations,
    places,
    topics,
    imperativeVerbCount,
    numberCount,
  };
}
