import chalk from "chalk";
import type { AnalyzerResultType } from "../../analyzer/schema.js";
import type {
  SitemapResultType,
  SitemapUrlResultType,
} from "../../sitemap/schema.js";

function scoreColor(score: number, max: number): (text: string) => string {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 90) return chalk.green;
  if (pct >= 50) return chalk.yellow;
  return chalk.red;
}

function gradeColor(grade: string): (text: string) => string {
  if (grade.startsWith("A")) return chalk.green;
  if (grade.startsWith("B") || grade.startsWith("C")) return chalk.yellow;
  return chalk.red;
}

function pad(str: string, len: number): string {
  return str + " ".repeat(Math.max(0, len - str.length));
}

function dots(len: number): string {
  return chalk.dim(".".repeat(len));
}

function renderDomainSignalsBlock(
  lines: string[],
  signalsBase: string,
  rawData: AnalyzerResultType["rawData"],
): void {
  const robotsFound = rawData.crawlerAccess !== undefined;
  const llmsFound = rawData.llmsTxt?.llmsTxtExists ?? false;
  const llmsFullFound = rawData.llmsTxt?.llmsFullTxtExists ?? false;

  lines.push(chalk.dim(`  Domain signals checked at: ${signalsBase}`));
  lines.push(
    chalk.dim(
      `    robots.txt ........ ${robotsFound ? chalk.green("found") : chalk.red("not found")}`,
    ),
  );
  lines.push(
    chalk.dim(
      `    llms.txt .......... ${llmsFound ? chalk.green("found") : chalk.red("not found")}`,
    ),
  );
  lines.push(
    chalk.dim(
      `    llms-full.txt ..... ${llmsFullFound ? chalk.green("found") : chalk.red("not found")}`,
    ),
  );
}

export function renderPretty(result: AnalyzerResultType): string {
  const lines: string[] = [];
  const width = 60;
  const divider = chalk.dim("=".repeat(width));
  const thinDivider = chalk.dim("-".repeat(width));

  lines.push("");
  lines.push(divider);
  lines.push(chalk.bold("  AI SEO Audit Report"));
  lines.push(chalk.dim(`  ${result.url}`));
  lines.push(divider);
  lines.push("");

  const overallScoreColor = scoreColor(result.overallScore, 100);
  const overallGradeColor = gradeColor(result.grade);
  lines.push(
    `  Overall Score: ${overallScoreColor(`${result.overallScore}/100`)}  Grade: ${overallGradeColor(result.grade)}`,
  );
  lines.push(chalk.dim(`  Points: ${result.totalPoints}/${result.maxPoints}`));
  lines.push("");
  renderDomainSignalsBlock(lines, result.signalsBase, result.rawData);
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

    for (let i = 0; i < result.recommendations.length; i++) {
      const rec = result.recommendations[i];
      const tag =
        rec.priority === "high"
          ? chalk.red(`[HIGH]`)
          : rec.priority === "medium"
            ? chalk.yellow(`[MED] `)
            : chalk.dim(`[LOW] `);

      lines.push(`  ${i + 1}. ${tag} ${chalk.bold(rec.factor)}`);
      lines.push(`     ${chalk.dim(rec.recommendation)}`);

      if (rec.steps && rec.steps.length > 0) {
        lines.push("");
        lines.push(`     ${chalk.dim("Steps:")}`);
        rec.steps.forEach((step, idx) => {
          lines.push(`       ${chalk.dim(`${idx + 1}. ${step}`)}`);
        });
      }

      if (rec.codeExample) {
        lines.push("");
        lines.push(`     ${chalk.dim("Example:")}`);
        lines.push(`     ${chalk.dim("┌" + "─".repeat(50))}`);
        rec.codeExample.split("\n").forEach((line) => {
          lines.push(`     ${chalk.dim("│")} ${chalk.dim(line)}`);
        });
        lines.push(`     ${chalk.dim("└" + "─".repeat(50))}`);
      }

      if (rec.learnMoreUrl) {
        lines.push("");
        lines.push(`     ${chalk.dim(`Learn more: ${rec.learnMoreUrl}`)}`);
      }

      lines.push("");
    }
  }

  lines.push(divider);
  lines.push(chalk.dim(`  Analyzed at: ${result.analyzedAt}`));
  lines.push(chalk.dim(`  Duration: ${result.meta.analysisDurationMs}ms`));
  if (result.url.startsWith("http://")) {
    lines.push(
      chalk.yellow(
        "  Note: Audited over HTTP. Domain signals (robots.txt, llms.txt) may differ in production.",
      ),
    );
  }
  lines.push(divider);
  lines.push("");

  return lines.join("\n");
}

export function renderSitemapPretty(result: SitemapResultType): string {
  const lines: string[] = [];
  const width = 60;
  const divider = chalk.dim("=".repeat(width));
  const thinDivider = chalk.dim("-".repeat(width));

  lines.push("");
  lines.push(divider);
  lines.push(chalk.bold("  AI SEO Sitemap Audit Report"));
  lines.push(chalk.dim(`  ${result.sitemapUrl}`));
  lines.push(divider);
  lines.push("");

  const averageScoreColor = scoreColor(result.averageScore, 100);
  const averageGradeColor = gradeColor(result.averageGrade);
  lines.push(
    `  Average Score: ${averageScoreColor(`${result.averageScore}/100`)}  Grade: ${averageGradeColor(result.averageGrade)}`,
  );
  lines.push(
    chalk.dim(
      `  URLs: ${result.succeededCount} audited, ${result.failedCount} failed, ${result.totalUrls} total`,
    ),
  );
  lines.push("");
  lines.push(chalk.dim(`  Domain signals checked at: ${result.signalsBase}`));
  lines.push("");
  lines.push(thinDivider);

  if (Object.keys(result.categoryAverages).length > 0) {
    lines.push("");
    lines.push(chalk.bold("  Site-Wide Category Averages:"));
    lines.push("");
    for (const avg of Object.values(result.categoryAverages)) {
      const color = scoreColor(avg.averagePct, 100);
      const name = pad(avg.name, 38);
      const dts = dots(Math.max(2, 40 - avg.name.length));
      lines.push(`  ${chalk.bold(name)} ${dts} ${color(`${avg.averagePct}%`)}`);
    }
    lines.push("");
    lines.push(thinDivider);
  }

  lines.push("");
  lines.push(chalk.bold("  URL Results:"));
  lines.push("");

  for (const urlResult of result.urlResults) {
    if (urlResult.status === "failed") {
      lines.push(`  ${chalk.red("✗")} ${chalk.dim(urlResult.url)}`);
      lines.push(`    ${chalk.red(`Error: ${urlResult.error}`)}`);
      lines.push("");
      continue;
    }

    const { result: r } = urlResult as Extract<
      SitemapUrlResultType,
      { status: "success" }
    >;
    const urlScoreColor = scoreColor(r.overallScore, 100);
    const urlGradeColor = gradeColor(r.grade);
    const topRec = r.recommendations[0];

    lines.push(`  ${chalk.green("✓")} ${chalk.dim(r.url)}`);
    lines.push(
      `    Score: ${urlScoreColor(`${r.overallScore}/100`)}  Grade: ${urlGradeColor(r.grade)}`,
    );
    if (topRec) {
      lines.push(
        `    ${chalk.dim(`Top rec: ${topRec.factor} — ${topRec.recommendation}`)}`,
      );
    }
    lines.push("");
  }

  lines.push(divider);
  lines.push(chalk.dim(`  Analyzed at: ${result.analyzedAt}`));
  lines.push(chalk.dim(`  Duration: ${result.meta.analysisDurationMs}ms`));
  const hasHttpUrls = result.urlResults.some(
    (r) =>
      r.status === "success" &&
      (
        r as Extract<SitemapUrlResultType, { status: "success" }>
      ).result.url.startsWith("http://"),
  );
  if (hasHttpUrls) {
    lines.push(
      chalk.yellow(
        "  Note: Some URLs were audited over HTTP. Domain signals (robots.txt, llms.txt) may differ in production.",
      ),
    );
  }
  lines.push(divider);
  lines.push("");

  return lines.join("\n");
}
