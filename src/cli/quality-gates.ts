import type { DiffResultType } from "../modules/diff/schema.js";
import type { SitemapResultType } from "../modules/sitemap/schema.js";

export function checkRegressionGate(
  diff: DiffResultType | null,
  options: { failOnRegression?: boolean; failOnNewBlocker?: boolean },
): { code: number; message?: string } {
  if (!options.failOnRegression && !options.failOnNewBlocker)
    return { code: 0 };
  if (!diff)
    return {
      code: 2,
      message:
        "A regression gate requires an existing baseline. Run once without the gate to establish it.",
    };
  if (!diff.comparison?.comparable)
    return {
      code: 2,
      message: `Cannot enforce regression gate: ${(diff.comparison?.reasons ?? ["baseline comparability is unknown"]).join(" ")}`,
    };
  if (diff.newBlockers?.length)
    return {
      code: 1,
      message: `New eligibility blockers: ${diff.newBlockers.join(", ")}`,
    };
  if (
    options.failOnRegression &&
    (diff.overallDelta < 0 ||
      diff.queryDeltas?.some((query) => query.regressed))
  ) {
    return {
      code: 1,
      message: "Audit regressed against the comparable baseline.",
    };
  }
  return { code: 0 };
}

export function checkSitemapGate(
  result: SitemapResultType,
  options: { failedPages?: "error" | "ignore"; failUnder?: number },
): { code: number; message?: string } {
  if (result.failedCount > 0 && options.failedPages !== "ignore")
    return {
      code: 2,
      message: `${result.failedCount} pages failed to audit. Use --failed-pages ignore only when partial coverage is acceptable.`,
    };
  if (result.failedSitemapCount && options.failedPages !== "ignore")
    return {
      code: 2,
      message: `${result.failedSitemapCount} child sitemaps could not be fully read. Use --failed-pages ignore only when partial coverage is acceptable.`,
    };
  if (result.succeededCount === 0)
    return { code: 2, message: "No pages were successfully audited." };
  if (
    options.failUnder !== undefined &&
    result.averageScore < options.failUnder
  )
    return {
      code: 1,
      message: `Average score ${result.averageScore} is below threshold ${options.failUnder}`,
    };
  return { code: 0 };
}
