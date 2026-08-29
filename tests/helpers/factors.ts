import type { CategoryAuditOutputType } from "../../src/modules/audits/schema.js";

export function findFactor<OutputType extends CategoryAuditOutputType>(
  output: OutputType,
  name: string,
) {
  return output.category.factors.find((factor) => factor.name === name);
}
