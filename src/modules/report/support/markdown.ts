import type { AnalyzerResultType } from "../../analyzer/schema.js";
import type { SitemapResultType } from "../../sitemap/schema.js";
import { buildTldr, type TldrType } from "./tldr.js";
import {
  escapeMarkdownTableCell,
  generatedByLine,
  groupRecommendationsByCategory,
  hasHttpUrls,
  HTTP_AUDIT_NOTE,
  markdownFenceFor,
  percent,
  priorityLabel,
  SITEMAP_HTTP_AUDIT_NOTE,
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

  for (const category of Object.values(result.categories)) {
    const pct = percent(category.score, category.maxScore);
    lines.push(`### ${category.name} (${pct}%)`);
    lines.push("");
    lines.push("| Factor | Score | Status | Details |");
    lines.push("|--------|-------|--------|---------|");

    for (const factor of category.factors) {
      const statusIcon =
        factor.status === "good"
          ? "pass"
          : factor.status === "neutral"
            ? "-"
            : factor.status === "needs_improvement"
              ? "warn"
              : "fail";
      lines.push(
        `| ${factor.name} | ${factor.score}/${factor.maxScore} | ${statusIcon} | ${escapeMarkdownTableCell(factor.value)} |`,
      );
    }

    lines.push("");
  }

  if (result.recommendations.length > 0) {
    lines.push("## Recommendations");
    lines.push("");

    for (const [categoryName, categoryRecs] of groupRecommendationsByCategory(
      result,
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

  if (tldr.quickestWins.length > 0) {
    renderTldrSection(lines, tldr);
  } else {
    lines.push(
      `**${tldr.score}/100 (${tldr.grade})** — no quick wins identified.`,
    );
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
  if (tldr.quickestWins.length === 0) return;

  lines.push(`## Quick Summary`);
  lines.push("");
  lines.push(
    `**${tldr.score}/100 (${tldr.grade})** → Top ${tldr.quickestWins.length} fixes: **~${tldr.projectedScore}/100 (${tldr.projectedGrade})**`,
  );
  lines.push("");
  lines.push("Quickest wins:");
  tldr.quickestWins.forEach((win, i) => {
    lines.push(
      `${i + 1}. **+${win.expectedGain} pts** — ${win.factor} (${win.category})`,
    );
  });
  lines.push("");
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
