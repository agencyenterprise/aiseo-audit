import type { AuditRawDataType } from "../audits/schema.js";

const POLISHED_FLESCH_RANGE = { min: 50, max: 75 };
const POLISHED_SENTENCE_RANGE = { min: 12, max: 24 };

export function pageReadsAsPolished(
  rawData: Partial<AuditRawDataType>,
): boolean {
  const flesch = rawData.readabilityScore;
  const avgSentence = rawData.avgSentenceLength;
  const hasHeadedStructure = (rawData.sectionLengths?.sectionCount ?? 0) > 0;

  return (
    flesch !== undefined &&
    flesch >= POLISHED_FLESCH_RANGE.min &&
    flesch <= POLISHED_FLESCH_RANGE.max &&
    avgSentence !== undefined &&
    avgSentence >= POLISHED_SENTENCE_RANGE.min &&
    avgSentence <= POLISHED_SENTENCE_RANGE.max &&
    hasHeadedStructure
  );
}
