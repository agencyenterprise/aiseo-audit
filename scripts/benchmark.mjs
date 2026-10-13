import { analyzeHtml } from "../dist/index.mjs";
import { evaluateBenchmark } from "../benchmarks/evaluate.mjs";

const report = await evaluateBenchmark(analyzeHtml);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.passed === report.assertions ? 0 : 1;
