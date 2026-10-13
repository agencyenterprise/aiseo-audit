import { readFile } from "node:fs/promises";

export async function evaluateBenchmark(analyzeHtml) {
  const corpus = JSON.parse(
    await readFile(new URL("./corpus.json", import.meta.url), "utf8"),
  );
  const cases = [];
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  for (const entry of corpus.cases) {
    const html = await readFile(new URL(entry.file, import.meta.url), "utf8");
    const result = analyzeHtml(
      { html, url: entry.url, evaluationDate: corpus.evaluationDate },
      { queries: entry.queries ?? [], domain: entry.domain ?? "auto" },
    );
    for (const expectation of entry.expectations) {
      const finding = result.findings.find(
        (item) => item.ruleId === expectation.ruleId,
      );
      const observed = !finding
        ? "missing"
        : !finding.scored
          ? "unscored"
          : ["error", "warning"].includes(finding.severity)
            ? "issue"
            : "clear";
      if (expectation.expected === "issue" && observed === "issue")
        truePositives++;
      if (expectation.expected === "clear" && observed === "issue")
        falsePositives++;
      if (expectation.expected === "issue" && observed !== "issue")
        falseNegatives++;
      cases.push({
        caseId: entry.id,
        ...expectation,
        observed,
        passed: observed === expectation.expected,
      });
    }
  }
  return {
    corpusVersion: corpus.version,
    caseCount: corpus.cases.length,
    assertions: cases.length,
    passed: cases.filter((entry) => entry.passed).length,
    precision:
      truePositives + falsePositives
        ? truePositives / (truePositives + falsePositives)
        : null,
    recall:
      truePositives + falseNegatives
        ? truePositives / (truePositives + falseNegatives)
        : null,
    truePositives,
    falsePositives,
    falseNegatives,
    cases,
  };
}
