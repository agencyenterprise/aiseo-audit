import { STOPWORDS } from "../nlp/constants.js";

export type QueryCoverageType = {
  query: string;
  structuralCoverage: number;
  bodyCoverage: number;
  matchedTerms: string[];
  missingTerms: string[];
};

export function queryContentTerms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, " ")
        .split(/\s+/)
        .filter((term) => term.length > 2 && !STOPWORDS.has(term)),
    ),
  ];
}

export function measureQueryCoverage(
  query: string,
  structuralText: string,
  bodyText: string,
): QueryCoverageType {
  const terms = queryContentTerms(query);
  const structural = terms.filter((term) =>
    containsWholeWord(structuralText, term),
  );
  const inBody = terms.filter((term) => containsWholeWord(bodyText, term));

  return {
    query,
    structuralCoverage: shareOf(structural.length, terms.length),
    bodyCoverage: shareOf(inBody.length, terms.length),
    matchedTerms: inBody,
    missingTerms: terms.filter((term) => !inBody.includes(term)),
  };
}

function shareOf(covered: number, total: number): number {
  return total > 0 ? covered / total : 0;
}

function containsWholeWord(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}
