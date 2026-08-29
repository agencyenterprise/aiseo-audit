import type { AnalyzerResultType } from "../../analyzer/schema.js";
import type { FactorResultType } from "../../audits/schema.js";
import type { SitemapResultType } from "../../sitemap/schema.js";
import type { StageScoresType } from "../../scoring/schema.js";
import { buildTldr, type TldrType } from "./tldr.js";
import {
  enginePresetBanner,
  escapeMarkdownTableCell,
  generatedByLine,
  groupRecommendationsByCategory,
  hasHttpUrls,
  hiddenRecommendationsNote,
  HTTP_AUDIT_NOTE,
  isProductPage,
  markdownFenceFor,
  NON_ADDITIVE_RECS_NOTE,
  orderFactorsForDisplay,
  percent,
  priorityLabel,
  PRODUCT_PAGE_WARNING,
  SITEMAP_HTTP_AUDIT_NOTE,
  STAGE_LABELS,
  stagePctLabel,
  trippedGateLine,
  trippedGates,
  UNSCORED_DIAGNOSTIC_LABEL,
  visibleRecommendations,
} from "./view-model.js";

export function renderMarkdown(result: AnalyzerResultType): string {
  const lines: string[] = [];

  lines.push(`# AI SEO Audit`);
  lines.push("");
  lines.push(`**URL:** ${result.url}`);
  lines.push("");
  lines.push(`**Domain signals checked at:** \`${result.signalsBase}\``);
  lines.push("");

  renderTldrSection(lines, buildTldr(result));

  lines.push("| Category | Score | Percentage |");
  lines.push("|----------|-------|------------|");

  for (const category of Object.values(result.categories)) {
    const pct = percent(category.score, category.maxScore);
    lines.push(
      `| ${category.name} | ${category.score}/${category.maxScore} | ${pct}% |`,
    );
  }

  lines.push("");

  lines.push(
    `## Overall: ${result.overallScore}/100 (${result.grade}) - ${result.totalPoints}/${result.maxPoints} pts`,
  );
  lines.push("");

  if (result.stages) {
    renderStagesSection(lines, result.stages);
  }
  renderBanners(lines, result);

  for (const category of Object.values(result.categories)) {
    const pct = percent(category.score, category.maxScore);
    lines.push(`### ${category.name} (${pct}%)`);
    lines.push("");
    lines.push("| Factor | Score | Status | Evidence | Details |");
    lines.push("|--------|-------|--------|----------|---------|");

    for (const factor of orderFactorsForDisplay(category.factors)) {
      lines.push(factorRow(factor));
    }

    lines.push("");
  }

  if (result.recommendations.length > 0) {
    lines.push("## Recommendations");
    lines.push("");

    const trimmedResult = {
      categories: result.categories,
      recommendations: visibleRecommendations(result.recommendations),
    };
    for (const [categoryName, categoryRecs] of groupRecommendationsByCategory(
      trimmedResult,
    )) {
      lines.push(`### ${categoryName}`);
      lines.push("");

      for (const rec of categoryRecs) {
        const tag = priorityTag(rec.priority);
        lines.push(`- [${tag}] **${rec.factor}**: ${rec.recommendation}`);

        if (rec.steps && rec.steps.length > 0) {
          rec.steps.forEach((step, idx) => {
            lines.push(`  ${idx + 1}. ${step}`);
          });
        }

        if (rec.codeExample) {
          renderCodeExample(lines, rec.codeExample);
        }

        if (rec.learnMoreUrl) {
          lines.push("");
          lines.push(`  [Learn more](${rec.learnMoreUrl})`);
        }

        if (rec.steps || rec.codeExample || rec.learnMoreUrl) {
          lines.push("");
        }
      }

      lines.push("");
    }

    const hiddenNote = hiddenRecommendationsNote(result.recommendations);
    if (hiddenNote) {
      lines.push(`_${hiddenNote}_`);
      lines.push("");
    }
    lines.push(`> ${NON_ADDITIVE_RECS_NOTE}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(
    `*${generatedByLine(result.meta.version)} | ${result.analyzedAt} | ${result.meta.analysisDurationMs}ms*`,
  );
  if (result.url.startsWith("http://")) {
    lines.push("");
    lines.push(`> **Note:** ${HTTP_AUDIT_NOTE}`);
  }

  return lines.join("\n");
}

export function renderMarkdownTldr(result: AnalyzerResultType): string {
  const tldr = buildTldr(result);
  const lines: string[] = [];
  lines.push(`# AI SEO Audit`);
  lines.push("");
  lines.push(`**URL:** ${result.url}`);
  lines.push("");

  if (tldr.topFixes.length > 0) {
    renderTldrSection(lines, tldr);
  } else {
    lines.push(`**${tldr.score}/100 (${tldr.grade})**. No fixes identified.`);
    lines.push("");
  }

  return lines.join("\n");
}

export function renderSitemapMarkdown(result: SitemapResultType): string {
  const lines: string[] = [];

  lines.push("# AI SEO Sitemap Audit Report");
  lines.push("");
  lines.push(`**Sitemap:** ${result.sitemapUrl}`);
  lines.push(`**Domain signals checked at:** \`${result.signalsBase}\``);
  lines.push(`**Analyzed at:** ${result.analyzedAt}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Average Score | ${result.averageScore}/100 |`);
  lines.push(`| Average Grade | ${result.averageGrade} |`);
  lines.push(`| Total URLs | ${result.totalUrls} |`);
  lines.push(`| Succeeded | ${result.succeededCount} |`);
  lines.push(`| Failed | ${result.failedCount} |`);
  lines.push("");

  if (Object.keys(result.categoryAverages).length > 0) {
    lines.push("## Site-Wide Category Averages");
    lines.push("");
    lines.push("| Category | Average Score |");
    lines.push("|----------|---------------|");
    for (const avg of Object.values(result.categoryAverages)) {
      lines.push(`| ${avg.name} | ${avg.averagePct}% |`);
    }
    lines.push("");
  }

  if (result.hostProfile) {
    const host = result.hostProfile;
    lines.push("## Host Profile");
    lines.push("");
    lines.push("| Signal | Value |");
    lines.push("|--------|-------|");
    lines.push(
      `| Site name | ${host.dominantSiteName ? `"${host.dominantSiteName}" on ${host.siteNameUniformityPct}% of pages` : "not resolvable"} |`,
    );
    lines.push(
      `| Organization schema | ${host.organizationSchemaPct}% of pages |`,
    );
    lines.push(`| Author bylines | ${host.bylineCoveragePct}% of pages |`);
    lines.push(
      `| About/contact links | ${host.aboutOrContactFound ? "found" : "not found"} |`,
    );
    lines.push("");
    lines.push(`> ${host.note}`);
    lines.push("");
  }

  lines.push("## URL Results");
  lines.push("");

  for (const urlResult of result.urlResults) {
    if (urlResult.status === "failed") {
      lines.push(`### ✗ ${urlResult.url}`);
      lines.push("");
      lines.push(`**Error:** ${urlResult.error}`);
      lines.push("");
      continue;
    }

    const { result: r } = urlResult;
    lines.push(`### ${r.url}`);
    lines.push("");
    lines.push(
      `**Score:** ${r.overallScore}/100 | **Grade:** ${r.grade} | **Points:** ${r.totalPoints}/${r.maxPoints}`,
    );
    lines.push("");

    lines.push("| Category | Score | Percentage |");
    lines.push("|----------|-------|------------|");
    for (const category of Object.values(r.categories)) {
      const pct = percent(category.score, category.maxScore);
      lines.push(
        `| ${category.name} | ${category.score}/${category.maxScore} | ${pct}% |`,
      );
    }
    lines.push("");

    if (r.recommendations.length > 0) {
      lines.push("**Recommendations:**");
      lines.push("");
      for (const rec of r.recommendations) {
        lines.push(
          `- [${priorityTag(rec.priority)}] **${rec.factor}**: ${rec.recommendation}`,
        );
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push(
    `*${generatedByLine(result.meta.version)} | ${result.analyzedAt} | ${result.meta.analysisDurationMs}ms*`,
  );
  if (hasHttpUrls(result.urlResults)) {
    lines.push("");
    lines.push(`> **Note:** ${SITEMAP_HTTP_AUDIT_NOTE}`);
  }

  return lines.join("\n");
}

function renderTldrSection(lines: string[], tldr: TldrType): void {
  if (tldr.topFixes.length === 0) return;

  lines.push(`## Quick Summary`);
  lines.push("");
  lines.push(`**${tldr.score}/100 (${tldr.grade})**`);
  lines.push("");
  lines.push("Top fixes:");
  tldr.topFixes.forEach((fix, i) => {
    lines.push(
      `${i + 1}. **${fix.factor}** (${fix.category}) - ${fix.auditPoints} audit pts`,
    );
  });
  lines.push("");
  lines.push(`> ${tldr.note}`);
  lines.push("");
}

function renderStagesSection(lines: string[], stages: StageScoresType): void {
  const eligibility = stages.technicalEligibility;
  const banner =
    eligibility.status === "pass"
      ? "**PASS**"
      : `**FAIL** (blockers: ${eligibility.blockers.join(", ") || "unknown"})`;

  lines.push("### Pipeline Stages");
  lines.push("");
  lines.push(
    `- ${STAGE_LABELS.technicalEligibility}: ${banner} ${stagePctLabel(eligibility.pct, eligibility.suppressed)}`,
  );
  lines.push(
    `- ${STAGE_LABELS.retrievalAlignment}: ${stagePctLabel(stages.retrievalAlignment.pct, stages.retrievalAlignment.suppressed)}`,
  );
  lines.push(
    `- ${STAGE_LABELS.citationFitness}: ${citationFitnessCell(stages)}`,
  );
  for (const gate of trippedGates(stages)) {
    lines.push(`  - ${trippedGateLine(gate)}`);
  }
  lines.push(
    `- ${STAGE_LABELS.provenance}: ${stagePctLabel(stages.provenance.pct, stages.provenance.suppressed)}`,
  );
  lines.push("");
}

function citationFitnessCell(stages: StageScoresType): string {
  const { pct, uncappedPct, suppressed } = stages.citationFitness;
  const base = stagePctLabel(pct, suppressed);
  if (
    !suppressed &&
    pct !== null &&
    uncappedPct !== null &&
    uncappedPct !== pct
  ) {
    return `${base} (uncapped ${uncappedPct}%)`;
  }
  return base;
}

function renderBanners(lines: string[], result: AnalyzerResultType): void {
  const engineBanner = enginePresetBanner(result.meta.engine);
  if (engineBanner) {
    lines.push(`> **${engineBanner}**`);
    lines.push("");
  }
  if (isProductPage(result)) {
    lines.push(`> **Product page:** ${PRODUCT_PAGE_WARNING}`);
    lines.push("");
  }
}

function factorRow(factor: FactorResultType): string {
  const evidence = factor.evidence ?? "-";
  return `| ${factor.name} | ${factor.score}/${factor.maxScore} | ${statusCell(factor.status)} | ${evidence} | ${escapeMarkdownTableCell(factor.value)} |`;
}

const STATUS_CELLS: Record<string, string> = {
  good: "pass",
  neutral: "-",
  needs_improvement: "warn",
  critical: "fail",
  info: `info (${UNSCORED_DIAGNOSTIC_LABEL})`,
};

function statusCell(status: string): string {
  return STATUS_CELLS[status] ?? "-";
}

function renderCodeExample(lines: string[], codeExample: string): void {
  const fence = markdownFenceFor(codeExample);
  lines.push("");
  lines.push(`  ${fence}`);
  codeExample.split("\n").forEach((line) => {
    lines.push(`  ${line}`);
  });
  lines.push(`  ${fence}`);
}

function priorityTag(priority: "high" | "medium" | "low"): string {
  const label = priorityLabel(priority);
  if (label === "HIGH") return "**HIGH**";
  if (label === "MED") return "*MED*";
  return "LOW";
}
