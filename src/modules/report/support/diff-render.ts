import chalk from "chalk";
import type { AiseoConfigType, DiffEntryType } from "../../config/schema.js";
import type { CategoryDeltaType, DiffResultType } from "../../diff/schema.js";

const SPARK_LEVELS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

export function renderDiffBlockPretty(diff: DiffResultType): string[] {
  const lines: string[] = [];
  lines.push(
    chalk.bold(
      `  Changes since baseline (${shortDate(diff.baselineAnalyzedAt)} → ${shortDate(diff.currentAnalyzedAt)})`,
    ),
  );

  const formatted = formatDelta(diff.overallDelta);
  lines.push(
    `    Overall            ${diff.baselineScore} → ${diff.currentScore}  (${colorForDelta(diff.overallDelta)(formatted)})`,
  );

  for (const delta of Object.values(diff.categoryDeltas)) {
    if (delta.delta === 0) continue;
    const paddedName = delta.name.padEnd(18, " ");
    lines.push(
      `    ${paddedName} ${delta.baselineScore} → ${delta.currentScore}  (${colorForDelta(delta.delta)(formatDelta(delta.delta))})`,
    );
  }

  return lines;
}

export function renderDiffBlockMarkdown(diff: DiffResultType): string[] {
  const lines: string[] = [];
  lines.push(
    `## Changes since ${shortDate(diff.baselineAnalyzedAt)} → ${shortDate(diff.currentAnalyzedAt)}`,
  );
  lines.push("");
  lines.push("| Scope | Baseline | Current | Change |");
  lines.push("|---|---|---|---|");
  lines.push(
    `| **Overall** | ${diff.baselineScore} | ${diff.currentScore} | ${formatDelta(diff.overallDelta)} |`,
  );
  for (const delta of Object.values(diff.categoryDeltas)) {
    if (delta.delta === 0) continue;
    lines.push(
      `| ${delta.name} | ${delta.baselineScore} | ${delta.currentScore} | ${formatDelta(delta.delta)} |`,
    );
  }
  lines.push("");
  return lines;
}

export function renderDiffBlockHtml(diff: DiffResultType): string {
  const rows = Object.values(diff.categoryDeltas)
    .filter((d) => d.delta !== 0)
    .map(renderCategoryDeltaRowHtml)
    .join("");

  return `<section class="diff-block">
    <h2>Changes since ${escapeTextForHtml(shortDate(diff.baselineAnalyzedAt))} → ${escapeTextForHtml(shortDate(diff.currentAnalyzedAt))}</h2>
    <table class="diff-table">
      <thead><tr><th>Scope</th><th>Baseline</th><th>Current</th><th>Change</th></tr></thead>
      <tbody>
        <tr class="diff-overall"><td>Overall</td><td>${diff.baselineScore}</td><td>${diff.currentScore}</td><td class="${cssClassForDelta(diff.overallDelta)}">${escapeTextForHtml(formatDelta(diff.overallDelta))}</td></tr>
        ${rows}
      </tbody>
    </table>
  </section>`;
}

export function renderTimelinePretty(
  diff: NonNullable<AiseoConfigType["diff"]>,
): string {
  const urls = Object.keys(diff);
  const totalRuns = urls.reduce((sum, url) => sum + diff[url].length, 0);

  const lines: string[] = [];
  lines.push("");
  lines.push(
    chalk.bold(
      `  Audit History (${urls.length} URL${urls.length === 1 ? "" : "s"} tracked, ${totalRuns} total runs)`,
    ),
  );
  lines.push("");

  const urlPad = Math.max(...urls.map((u) => u.length), 20);
  for (const url of urls) {
    const entries = diff[url];
    const sparkline = buildSparkline(entries);
    const scoreSummary = entries.map((e) => String(e.score)).join(" → ");
    lines.push(
      `  ${url.padEnd(urlPad, " ")}  ${chalk.green(sparkline)}  ${chalk.dim(scoreSummary)}`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

export function renderTimelineJson(
  diff: NonNullable<AiseoConfigType["diff"]>,
): string {
  return JSON.stringify({ urls: diff }, null, 2);
}

export function renderTimelineMarkdown(
  diff: NonNullable<AiseoConfigType["diff"]>,
): string {
  const lines: string[] = [];
  lines.push(`# AI SEO Audit History`);
  lines.push("");
  lines.push("| URL | Runs | Latest Score | Trend |");
  lines.push("|---|---|---|---|");
  for (const [url, entries] of Object.entries(diff)) {
    const latest = entries[entries.length - 1];
    const trend = entries.map((e) => e.score).join(" → ");
    lines.push(`| ${url} | ${entries.length} | ${latest.score} | ${trend} |`);
  }
  return lines.join("\n");
}

export function renderTimelineHtml(
  diff: NonNullable<AiseoConfigType["diff"]>,
): string {
  const rows = Object.entries(diff)
    .map(([url, entries]) => {
      const sparklineSvg = renderSparklineSvg(entries);
      const latestScore = entries[entries.length - 1].score;
      return `<tr>
        <td class="timeline-url">${escapeTextForHtml(url)}</td>
        <td class="timeline-runs">${entries.length}</td>
        <td class="timeline-latest">${latestScore}</td>
        <td class="timeline-trend">${sparklineSvg}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>AI SEO Audit History</title>
<style>
body { font: 14px -apple-system, system-ui, sans-serif; margin: 2rem auto; max-width: 900px; color: #222; }
h1 { margin-bottom: 1rem; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #eee; }
th { color: #666; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.3px; }
.timeline-url { font-family: ui-monospace, monospace; }
.timeline-runs, .timeline-latest { text-align: right; width: 80px; }
.timeline-trend svg { display: block; }
</style>
</head>
<body>
<h1>AI SEO Audit History</h1>
<table>
  <thead><tr><th>URL</th><th>Runs</th><th>Latest</th><th>Trend</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</body>
</html>`;
}

function renderCategoryDeltaRowHtml(delta: CategoryDeltaType): string {
  return `<tr><td>${escapeTextForHtml(delta.name)}</td><td>${delta.baselineScore}</td><td>${delta.currentScore}</td><td class="${cssClassForDelta(delta.delta)}">${escapeTextForHtml(formatDelta(delta.delta))}</td></tr>`;
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "0";
}

function colorForDelta(delta: number): (input: string) => string {
  if (delta > 0) return chalk.green;
  if (delta < 0) return chalk.red;
  return chalk.dim;
}

function cssClassForDelta(delta: number): string {
  if (delta > 0) return "delta-positive";
  if (delta < 0) return "delta-negative";
  return "delta-zero";
}

function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

function buildSparkline(entries: DiffEntryType[]): string {
  if (entries.length === 0) return "";
  const scores = entries.map((e) => e.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min;
  return scores
    .map((score) => {
      if (range === 0) return SPARK_LEVELS[4];
      const normalized = (score - min) / range;
      const idx = Math.round(normalized * (SPARK_LEVELS.length - 1));
      return SPARK_LEVELS[idx];
    })
    .join("");
}

function renderSparklineSvg(entries: DiffEntryType[]): string {
  if (entries.length === 0) return "";
  const width = 120;
  const height = 28;
  const min = Math.min(...entries.map((e) => e.score));
  const max = Math.max(...entries.map((e) => e.score));
  const range = max - min || 1;
  const points = entries
    .map((entry, i) => {
      const x = (i / Math.max(1, entries.length - 1)) * width;
      const y = height - ((entry.score - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><polyline fill="none" stroke="#006633" stroke-width="2" points="${points}"/></svg>`;
}

function escapeTextForHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
