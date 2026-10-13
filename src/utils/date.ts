export function normalizeEvaluationDate(value?: string): string {
  const date = value ?? new Date().toISOString().slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  ) {
    throw new Error(
      "evaluationDate must be a valid UTC date in YYYY-MM-DD format.",
    );
  }
  return date;
}
