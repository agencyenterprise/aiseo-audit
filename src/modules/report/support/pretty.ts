import chalk from "chalk";
import type { AnalyzerResultType } from "../../analyzer/schema.js";
import type { FactorResultType } from "../../audits/schema.js";
import type { SitemapResultType } from "../../sitemap/schema.js";
import type { StageScoresType } from "../../scoring/schema.js";
import { buildTldr, type TldrType } from "./tldr.js";
import {
  enginePresetBanner,
  generatedByLine,
  hasHttpUrls,
  hiddenRecommendationsNote,
  HTTP_AUDIT_NOTE,
  isProductPage,
  NON_ADDITIVE_RECS_NOTE,
  orderFactorsForDisplay,
  priorityLabel,
  PRODUCT_PAGE_WARNING,
  scoreBand,
  SITEMAP_HTTP_AUDIT_NOTE,
  STAGE_LABELS,
  stagePctLabel,
  trippedGateLine,
  trippedGates,
  UNSCORED_DIAGNOSTIC_LABEL,
  visibleRecommendations,
} from "./view-model.js";

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

  const tldr = buildTldr(result);
  if (tldr.topFixes.length > 0) {
    renderTldrBlock(lines, tldr);
    lines.push("");
    lines.push(thinDivider);
    lines.push("");
  }

  const overallScoreColor = scoreColor(result.overallScore, 100);
  const overallGradeColor = gradeColor(result.grade);
  lines.push(
    `  Overall Score: ${overallScoreColor(`${result.overallScore}/100`)}  Grade: ${overallGradeColor(result.grade)}`,
  );
  lines.push(chalk.dim(`  Points: ${result.totalPoints}/${result.maxPoints}`));
  lines.push("");
  if (result.stages) {
    renderStagesBlock(lines, result.stages);
    lines.push("");
  }
  renderBanners(lines, result);
  renderDomainSignalsBlock(lines, result.signalsBase, result.rawData);
  lines.push("");
  lines.push(thinDivider);

  for (const category of Object.values(result.categories)) {
    const catColor = scoreColor(category.score, category.maxScore);
    const catLabel =
      category.maxScore > 0
        ? `(${Math.round((category.score / category.maxScore) * 100)}%)`
        : "(not applicable to this page)";
    lines.push("");
    lines.push(
      `  ${chalk.bold(pad(category.name, LABEL_COL))} ${dots(Math.max(2, LABEL_COL + 2 - category.name.length))} ${catColor(`${category.score}/${category.maxScore}`)} ${chalk.dim(catLabel)}`,
    );

    for (const factor of orderFactorsForDisplay(category.factors)) {
      lines.push(factorLine(factor));
    }
  }

  lines.push("");
  lines.push(thinDivider);

  if (result.recommendations.length > 0) {
    lines.push("");
    lines.push(chalk.bold("  Recommendations:"));
    lines.push("");

    const shown = visibleRecommendations(result.recommendations);
    for (let i = 0; i < shown.length; i++) {
      const rec = shown[i];
      const label = priorityLabel(rec.priority);
      const tag =
        label === "HIGH"
          ? chalk.red("[HIGH]")
          : label === "MED"
            ? chalk.yellow("[MED] ")
            : chalk.dim("[LOW] ");

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

    const hiddenNote = hiddenRecommendationsNote(result.recommendations);
    if (hiddenNote) {
      lines.push(chalk.dim(`  ${hiddenNote}`));
      lines.push("");
    }
    lines.push(chalk.dim(`  ${NON_ADDITIVE_RECS_NOTE}`));
    lines.push("");
  }

  lines.push(divider);
  lines.push(chalk.dim(`  Analyzed at: ${result.analyzedAt}`));
  lines.push(chalk.dim(`  Duration: ${result.meta.analysisDurationMs}ms`));
  if (result.url.startsWith("http://")) {
    lines.push(chalk.yellow(`  Note: ${HTTP_AUDIT_NOTE}`));
  }
  lines.push(divider);
  lines.push("");

  return lines.join("\n");
}

export function renderPrettyTldr(result: AnalyzerResultType): string {
  const tldr = buildTldr(result);
  const lines: string[] = [];
  const divider = chalk.dim("=".repeat(60));

  lines.push("");
  lines.push(divider);
  lines.push(chalk.bold("  AI SEO Audit"));
  lines.push(chalk.dim(`  ${result.url}`));
  lines.push(divider);
  lines.push("");

  if (tldr.topFixes.length > 0) {
    renderTldrBlock(lines, tldr);
  } else {
    const overallScoreColor = scoreColor(tldr.score, 100);
    lines.push(
      `  Score: ${overallScoreColor(`${tldr.score}/100`)}  Grade: ${gradeColor(tldr.grade)(tldr.grade)}`,
    );
    lines.push(
      chalk.dim("  No fixes identified. Everything is already solid."),
    );
  }

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
      lines.push(
        `  ${chalk.bold(labelWithDots(avg.name))} ${color(`${avg.averagePct}%`)}`,
      );
    }
    lines.push("");
    lines.push(thinDivider);
  }

  if (result.hostProfile) {
    const host = result.hostProfile;
    lines.push("");
    lines.push(chalk.bold("  Host Profile:"));
    lines.push("");
    lines.push(
      `  ${chalk.bold(labelWithDots("Site name"))} ${host.dominantSiteName ? `"${host.dominantSiteName}" on ${host.siteNameUniformityPct}% of pages` : "not resolvable"}`,
    );
    lines.push(
      `  ${chalk.bold(labelWithDots("Organization schema"))} ${host.organizationSchemaPct}% of pages`,
    );
    lines.push(
      `  ${chalk.bold(labelWithDots("Author bylines"))} ${host.bylineCoveragePct}% of pages`,
    );
    lines.push(
      `  ${chalk.bold(labelWithDots("About/contact links"))} ${host.aboutOrContactFound ? "found" : "not found"}`,
    );
    lines.push("");
    lines.push(chalk.dim(`  ${host.note}`));
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

    const { result: r } = urlResult;
    const urlScoreColor = scoreColor(r.overallScore, 100);
    const urlGradeColor = gradeColor(r.grade);
    const topRec = r.recommendations[0];

    lines.push(`  ${chalk.green("✓")} ${chalk.dim(r.url)}`);
    lines.push(
      `    Score: ${urlScoreColor(`${r.overallScore}/100`)}  Grade: ${urlGradeColor(r.grade)}`,
    );
    if (topRec) {
      lines.push(
        `    ${chalk.dim(`Top rec: ${topRec.factor}: ${topRec.recommendation}`)}`,
      );
    }
    lines.push("");
  }

  lines.push(divider);
  lines.push(chalk.dim(`  Analyzed at: ${result.analyzedAt}`));
  lines.push(chalk.dim(`  Duration: ${result.meta.analysisDurationMs}ms`));
  if (hasHttpUrls(result.urlResults)) {
    lines.push(chalk.yellow(`  Note: ${SITEMAP_HTTP_AUDIT_NOTE}`));
  }
  lines.push(divider);
  lines.push("");

  return lines.join("\n");
}

function renderTldrBlock(lines: string[], tldr: TldrType): void {
  if (tldr.topFixes.length === 0) return;

  lines.push(
    `  Score: ${scoreColor(tldr.score, 100)(`${tldr.score}/100`)} ${chalk.dim(
      "Grade:",
    )} ${gradeColor(tldr.grade)(tldr.grade)}`,
  );
  lines.push("");
  lines.push(chalk.bold("  Top fixes:"));

  const indexWidth = String(tldr.topFixes.length).length;
  const pointsWidth = Math.max(
    ...tldr.topFixes.map((fix) => `${fix.auditPoints}`.length),
  );
  const factorWidth = Math.max(
    ...tldr.topFixes.map((fix) => fix.factor.length),
  );

  tldr.topFixes.forEach((fix, i) => {
    const index = String(i + 1).padStart(indexWidth, " ");
    const points = `${fix.auditPoints}`.padStart(pointsWidth, " ");
    const factor = fix.factor.padEnd(factorWidth, " ");
    lines.push(
      `    ${index}. ${chalk.green(points)} audit pts  ${factor}  ${chalk.dim(`(${fix.category})`)}`,
    );
  });
  lines.push("");
  lines.push(chalk.dim(`  ${tldr.note}`));
}

function renderStagesBlock(lines: string[], stages: StageScoresType): void {
  const eligibility = stages.technicalEligibility;
  const eligibilityBanner =
    eligibility.status === "pass"
      ? chalk.green("PASS")
      : chalk.red(
          `FAIL (blockers: ${eligibility.blockers.join(", ") || "unknown"})`,
        );

  lines.push(chalk.bold("  Pipeline Stages:"));
  lines.push(
    `    ${stageLabelWithDots(STAGE_LABELS.technicalEligibility)} ${eligibilityBanner} ${chalk.dim(stagePctLabel(eligibility.pct, eligibility.suppressed))}`,
  );
  lines.push(
    `    ${stageLabelWithDots(STAGE_LABELS.retrievalAlignment)} ${stagePctText(stages.retrievalAlignment.pct, stages.retrievalAlignment.suppressed)}`,
  );
  lines.push(
    `    ${stageLabelWithDots(STAGE_LABELS.citationFitness)} ${citationFitnessText(stages)}`,
  );
  for (const gate of trippedGates(stages)) {
    lines.push(chalk.yellow(`      ${trippedGateLine(gate)}`));
  }
  lines.push(
    `    ${stageLabelWithDots(STAGE_LABELS.provenance)} ${stagePctText(stages.provenance.pct, stages.provenance.suppressed)}`,
  );
}

function citationFitnessText(stages: StageScoresType): string {
  const { pct, uncappedPct, suppressed } = stages.citationFitness;
  const base = stagePctText(pct, suppressed);
  if (
    !suppressed &&
    pct !== null &&
    uncappedPct !== null &&
    uncappedPct !== pct
  ) {
    return `${base} ${chalk.dim(`(uncapped ${uncappedPct}%)`)}`;
  }
  return base;
}

function stagePctText(pct: number | null, suppressed: boolean): string {
  if (suppressed) return chalk.dim(stagePctLabel(pct, suppressed));
  if (pct === null) return chalk.dim("n/a");
  return scoreColor(pct, 100)(`${pct}%`);
}

function renderBanners(lines: string[], result: AnalyzerResultType): void {
  const engineBanner = enginePresetBanner(result.meta.engine);
  if (engineBanner) {
    lines.push(chalk.yellow(`  ${engineBanner}`));
    lines.push("");
  }
  if (isProductPage(result)) {
    lines.push(chalk.yellow(`  ${PRODUCT_PAGE_WARNING}`));
    lines.push("");
  }
}

function factorLine(factor: FactorResultType): string {
  const indented = `  ${factor.name}`;
  const padded = `  ${chalk.dim(pad(indented, LABEL_COL + 2))} ${dots(Math.max(2, LABEL_COL + 2 - indented.length))}`;
  const tierBadge = factor.evidence
    ? ` ${chalk.dim(`[${factor.evidence}]`)}`
    : "";

  if (factor.status === "info") {
    return `${padded} ${chalk.dim(`i ${UNSCORED_DIAGNOSTIC_LABEL}`)} ${chalk.dim(factor.value)}${tierBadge}`;
  }

  const fColor = scoreColor(factor.score, factor.maxScore);
  return `${padded} ${fColor(`${factor.score}/${factor.maxScore}`)} ${chalk.dim(factor.value)}${tierBadge}`;
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

const BAND_CHALK = {
  pass: chalk.green,
  average: chalk.yellow,
  fail: chalk.red,
} as const;

function scoreColor(score: number, max: number): (text: string) => string {
  const pct = max > 0 ? (score / max) * 100 : 0;
  return BAND_CHALK[scoreBand(pct)];
}

function gradeColor(grade: string): (text: string) => string {
  if (grade.startsWith("A")) return chalk.green;
  if (grade.startsWith("B") || grade.startsWith("C")) return chalk.yellow;
  return chalk.red;
}

const LABEL_COL = 38;
const STAGE_LABEL_COL = 24;

function labelWithDots(name: string): string {
  return `${pad(name, LABEL_COL)} ${dots(Math.max(2, LABEL_COL + 2 - name.length))}`;
}

function stageLabelWithDots(name: string): string {
  return `${pad(name, STAGE_LABEL_COL)} ${dots(Math.max(2, STAGE_LABEL_COL + 2 - name.length))}`;
}

function pad(str: string, len: number): string {
  return str + " ".repeat(Math.max(0, len - str.length));
}

function dots(len: number): string {
  return chalk.dim(".".repeat(len));
}
