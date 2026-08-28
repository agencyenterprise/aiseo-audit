import { maxFactors, sumFactors } from "../scoring/service.js";
import { CATEGORY_DISPLAY_NAMES } from "./constants.js";
import type {
  CategoryAuditOutputType,
  CategoryNameType,
  FactorResultType,
} from "./schema.js";

export function buildCategoryOutput(
  key: CategoryNameType,
  factors: FactorResultType[],
  rawData: CategoryAuditOutputType["rawData"] = {},
): CategoryAuditOutputType {
  return {
    category: {
      name: CATEGORY_DISPLAY_NAMES[key],
      key,
      score: sumFactors(factors),
      maxScore: maxFactors(factors),
      factors,
    },
    rawData,
  };
}
