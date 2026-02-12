import chalk from "chalk";
import type { AnalyzerResultType } from "../../analyzer/schema.js";

function scoreColor(score: number, max: number): (text: string) => string {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 70) return chalk.green;
  if (pct >= 40) return chalk.yellow;
  return chalk.red;
}

function gradeColor(grade: string): (text: string) => string {
  if (grade.startsWith("A")) return chalk.green;
  if (grade.startsWith("B")) return chalk.yellow;
  return chalk.red;
}

function pad(str: string, len: number): string {
  return str + " ".repeat(Math.max(0, len - str.length));
}

function dots(len: number): string {
  return chalk.dim(".".repeat(len));
}

export function renderPretty(result: AnalyzerResultType): string {
  const lines: string[] = [];
  const width = 60;
  const divider = chalk.dim("=".repeat(width));
  const thinDivider = chalk.dim("-".repeat(width));

  lines.push("");
  lines.push(divider);
  lines.push(chalk.bold("  GEO Audit Report"));
  lines.push(chalk.dim(`  ${result.url}`));
  lines.push(divider);
  lines.push("");

  const sc = scoreColor(result.overallScore, 100);
  const gc = gradeColor(result.grade);
  lines.push(
    `  Overall Score: ${sc(`${result.overallScore}/100`)}  Grade: ${gc(result.grade)}`,
  );
  lines.push(chalk.dim(`  Points: ${result.totalPoints}/${result.maxPoints}`));
  lines.push("");
  lines.push(thinDivider);

  for (const category of Object.values(result.categories)) {
    const catColor = scoreColor(category.score, category.maxScore);
    const catPct =
      category.maxScore > 0
        ? Math.round((category.score / category.maxScore) * 100)
        : 0;
    const catName = pad(category.name, 38);
    const catDots = dots(Math.max(2, 40 - category.name.length));

    lines.push("");
    lines.push(
      `  ${chalk.bold(catName)} ${catDots} ${catColor(`${category.score}/${category.maxScore}`)} ${chalk.dim(`(${catPct}%)`)}`,
    );

    for (const factor of category.factors) {
      const fColor = scoreColor(factor.score, factor.maxScore);
      const fName = pad(`  ${factor.name}`, 40);
      const fDots = dots(Math.max(2, 42 - factor.name.length));

      lines.push(
        `  ${chalk.dim(fName)} ${fDots} ${fColor(`${factor.score}/${factor.maxScore}`)} ${chalk.dim(factor.value)}`,
      );
    }
  }

  lines.push("");
  lines.push(thinDivider);

  if (result.recommendations.length > 0) {
    lines.push("");
    lines.push(chalk.bold("  Recommendations:"));
    lines.push("");

    const top = result.recommendations.slice(0, 8);
    for (let i = 0; i < top.length; i++) {
      const rec = top[i];
      const tag =
        rec.priority === "high"
          ? chalk.red(`[HIGH]`)
          : rec.priority === "medium"
            ? chalk.yellow(`[MED] `)
            : chalk.dim(`[LOW] `);

      lines.push(`  ${i + 1}. ${tag} ${chalk.bold(rec.factor)}`);
      lines.push(`     ${chalk.dim(rec.recommendation)}`);
      lines.push("");
    }

    if (result.recommendations.length > 8) {
      lines.push(
        chalk.dim(
          `  ... and ${result.recommendations.length - 8} more recommendations`,
        ),
      );
    }
  }

  lines.push(divider);
  lines.push(chalk.dim(`  Analyzed at: ${result.analyzedAt}`));
  lines.push(chalk.dim(`  Duration: ${result.meta.analysisDurationMs}ms`));
  lines.push(divider);
  lines.push("");

  return lines.join("\n");
}
