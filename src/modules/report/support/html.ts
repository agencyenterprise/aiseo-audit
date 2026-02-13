import type { AnalyzerResultType } from "../../analyzer/schema.js";

function scoreColorHex(pct: number): string {
  if (pct >= 90) return "#00cc66";
  if (pct >= 50) return "#ffaa33";
  return "#ff3333";
}

function scoreTextColorHex(pct: number): string {
  if (pct >= 90) return "#008800";
  if (pct >= 50) return "#ffaa33";
  return "#cc0000";
}

function scoreClass(pct: number): string {
  if (pct >= 90) return "pass";
  if (pct >= 50) return "average";
  return "fail";
}

function statusIcon(status: string): string {
  if (status === "good") return "&#10003;";
  if (status === "neutral") return "&#8212;";
  if (status === "needs_improvement") return "&#9650;";
  return "&#10007;";
}

function statusClass(status: string): string {
  if (status === "good") return "good";
  if (status === "neutral") return "neutral";
  if (status === "needs_improvement") return "warn";
  return "fail";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildGaugeSvg(
  score: number,
  size: "large" | "small" = "small",
): string {
  const pct = Math.max(0, Math.min(100, score));
  const arcColor = scoreColorHex(pct);
  const textColor = scoreTextColorHex(pct);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const dim = size === "large" ? 120 : 64;
  const fontSize = size === "large" ? 40 : 22;
  const strokeWidth = size === "large" ? 8 : 7;

  return `<svg class="gauge" viewBox="0 0 120 120" width="${dim}" height="${dim}">
      <circle cx="60" cy="60" r="${radius}" fill="none" stroke="#e0e0e0" stroke-width="${strokeWidth}"/>
      <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${arcColor}" stroke-width="${strokeWidth}"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 60 60)"/>
      <text x="60" y="${60 + fontSize * 0.35}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="${textColor}">${score}</text>
    </svg>`;
}

function buildMultiSegmentGauge(
  overallScore: number,
  grade: string,
  totalPoints: number,
  maxPoints: number,
  categories: Array<{
    key: string;
    name: string;
    score: number;
    maxScore: number;
  }>,
): string {
  const radius = 80;
  const strokeWidth = 14;
  const pad = 8;
  const size = (radius + strokeWidth / 2 + pad) * 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * radius;
  const textColor = scoreTextColorHex(overallScore);

  const trackCircle = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#e8e8e8" stroke-width="${strokeWidth}"/>`;

  const arcs: string[] = [];
  let consumed = 0;
  let segIdx = 0;

  for (const cat of categories) {
    const catDeg = maxPoints > 0 ? (cat.score / maxPoints) * 360 : 0;
    if (catDeg < 0.1) {
      consumed += catDeg;
      continue;
    }

    const catPct =
      cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0;
    const color = scoreColorHex(catPct);
    const arcLen = (catDeg / 360) * circ;
    const offset = circ * 0.25 - (consumed / 360) * circ;
    const catName = escapeHtml(cat.name);
    const idx = segIdx;

    arcs.push(
      `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none"
        stroke="${color}" stroke-width="${strokeWidth}"
        stroke-dasharray="${arcLen.toFixed(2)} ${(circ - arcLen).toFixed(2)}"
        stroke-dashoffset="${offset.toFixed(2)}"
        class="seg-arc" data-idx="${idx}"
        onmouseenter="document.getElementById('seg-pop-${idx}').style.display='flex'"
        onmouseleave="document.getElementById('seg-pop-${idx}').style.display='none'"/>`,
    );

    consumed += catDeg;

    const divRad = (consumed / 360) * 2 * Math.PI - Math.PI / 2;
    const half = strokeWidth / 2 + 1;
    const dx = Math.cos(divRad);
    const dy = Math.sin(divRad);
    arcs.push(
      `<line x1="${(cx + (radius - half) * dx).toFixed(2)}" y1="${(cy + (radius - half) * dy).toFixed(2)}"
        x2="${(cx + (radius + half) * dx).toFixed(2)}" y2="${(cy + (radius + half) * dy).toFixed(2)}"
        stroke="#fff" stroke-width="2" pointer-events="none"/>`,
    );

    segIdx++;
  }

  const popovers = categories
    .filter((cat) => cat.score > 0)
    .map((cat, i) => {
      const catPct =
        cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0;
      const color = scoreColorHex(catPct);
      return `<div id="seg-pop-${i}" class="seg-popover">
        <span class="seg-popover-dot" style="background:${color}"></span>
        <span class="seg-popover-name">${escapeHtml(cat.name)}</span>
        <span class="seg-popover-score">${catPct}%</span>
        <span class="seg-popover-pts">${cat.score}/${cat.maxScore} pts</span>
      </div>`;
    })
    .join("");

  return `<div class="overall-gauge-wrap">
    <svg class="gauge" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      ${trackCircle}
      ${arcs.join("\n      ")}
      <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="40" font-weight="700" fill="${textColor}">${overallScore}</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="14" font-weight="600" fill="${textColor}">${escapeHtml(grade)}</text>
      <text x="${cx}" y="${cy + 30}" text-anchor="middle" font-size="11" fill="#999">${totalPoints}/${maxPoints} pts</text>
    </svg>
    <div class="seg-popovers">${popovers}</div>
    <div class="score-scale">
      <span class="scale-fail">0-49</span>
      <span class="scale-average">50-89</span>
      <span class="scale-pass">90-100</span>
    </div>
  </div>`;
}

function buildCategoryGauge(category: {
  name: string;
  score: number;
  maxScore: number;
}): string {
  const pct =
    category.maxScore > 0
      ? Math.round((category.score / category.maxScore) * 100)
      : 0;

  return `<a class="gauge-item" href="#cat-${escapeHtml(category.name.replace(/\s+/g, "-").toLowerCase())}">
      ${buildGaugeSvg(pct, "small")}
      <span class="gauge-label">${escapeHtml(category.name)}</span>
    </a>`;
}

function buildCategorySection(category: {
  name: string;
  score: number;
  maxScore: number;
  factors: Array<{
    name: string;
    score: number;
    maxScore: number;
    value: string;
    status: string;
  }>;
}): string {
  const pct =
    category.maxScore > 0
      ? Math.round((category.score / category.maxScore) * 100)
      : 0;
  const cls = scoreClass(pct);
  const id = category.name.replace(/\s+/g, "-").toLowerCase();

  const factorRows = category.factors
    .map(
      (f) => `
          <div class="audit-row">
            <span class="audit-icon ${statusClass(f.status)}">${statusIcon(f.status)}</span>
            <span class="audit-name">${escapeHtml(f.name)}</span>
            <span class="audit-detail">${escapeHtml(f.value)}</span>
            <span class="audit-score">${f.score}/${f.maxScore}</span>
          </div>`,
    )
    .join("");

  return `
    <div class="category" id="cat-${id}">
      <div class="category-header">
        <div class="category-title ${cls}">${escapeHtml(category.name)}</div>
        <div class="category-score ${cls}">${pct}%</div>
      </div>
      <div class="audits">${factorRows}</div>
    </div>`;
}

function buildRecommendationRow(rec: {
  priority: string;
  factor: string;
  recommendation: string;
}): string {
  const cls =
    rec.priority === "high"
      ? "priority-high"
      : rec.priority === "medium"
        ? "priority-med"
        : "priority-low";
  const label =
    rec.priority === "high"
      ? "HIGH"
      : rec.priority === "medium"
        ? "MED"
        : "LOW";

  return `
      <div class="rec-row ${cls}">
        <span class="rec-tag">${label}</span>
        <span class="rec-factor">${escapeHtml(rec.factor)}</span>
        <span class="rec-text">${escapeHtml(rec.recommendation)}</span>
      </div>`;
}

function buildRecommendationsByCategory(
  recommendations: AnalyzerResultType["recommendations"],
  categories: AnalyzerResultType["categories"],
): string {
  const categoryNames = Object.values(categories).map((c) => c.name);
  const grouped = new Map<string, typeof recommendations>();

  for (const name of categoryNames) {
    const recs = recommendations.filter((r) => r.category === name);
    if (recs.length > 0) grouped.set(name, recs);
  }

  if (grouped.size === 0) return "";

  let html = `<div class="recs-section">
    <div class="recs-title">Recommendations</div>`;

  for (const [categoryName, recs] of grouped) {
    html += `<div class="rec-group">
      <div class="rec-group-name">${escapeHtml(categoryName)}</div>`;
    html += recs.map(buildRecommendationRow).join("");
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

export function renderHtml(result: AnalyzerResultType): string {
  const categoryEntries = Object.entries(result.categories);
  const categories = categoryEntries.map(([, c]) => c);
  const categoriesWithKeys = categoryEntries.map(([key, c]) => ({
    key,
    name: c.name,
    score: c.score,
    maxScore: c.maxScore,
  }));
  const gauges = categories.map(buildCategoryGauge).join("");
  const sections = categories.map(buildCategorySection).join("");
  const recsHtml = buildRecommendationsByCategory(
    result.recommendations,
    result.categories,
  );
  const overallGauge = buildMultiSegmentGauge(
    result.overallScore,
    result.grade,
    result.totalPoints,
    result.maxPoints,
    categoriesWithKeys,
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI SEO Audit - ${escapeHtml(result.url)}</title>
<style>
:root {
  --pass: #00cc66;
  --pass-text: #008800;
  --average: #ffaa33;
  --average-text: #ffaa33;
  --fail: #ff3333;
  --fail-text: #cc0000;
  --bg: #fff;
  --surface: #fff;
  --text: #212121;
  --text-secondary: #757575;
  --border: #e0e0e0;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* Topbar */
.topbar {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.topbar-title {
  font-weight: 600;
  margin-right: 12px;
  white-space: nowrap;
}
.topbar-url {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Container */
.report {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 32px;
}

/* Category gauges row */
.gauges-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 12px;
  padding: 24px 0;
  border-bottom: 1px solid var(--border);
}
.gauge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 110px;
  padding: 10px 6px 8px;
  text-decoration: none;
  color: var(--text);
  border-radius: 8px;
  transition: background 0.15s;
}
.gauge-item:hover {
  background: #f5f5f5;
}
.gauge-item .gauge { display: block; }
.gauge-label {
  margin-top: 8px;
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  color: var(--text-secondary);
  line-height: 1.25;
}

/* Overall score */
.overall {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 32px 0 24px;
  border-bottom: 1px solid var(--border);
}
.overall-gauge-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
.overall-gauge-wrap .gauge {
  display: block;
  overflow: visible;
}
.seg-arc {
  cursor: pointer;
  transition: stroke-width 0.15s ease, filter 0.15s ease;
}
.seg-arc:hover {
  stroke-width: 20;
  filter: brightness(1.1);
}

/* Segment popovers */
.seg-popovers {
  position: relative;
  min-height: 36px;
  display: flex;
  justify-content: center;
  margin-top: 4px;
}
.seg-popover {
  display: none;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  font-size: 13px;
  white-space: nowrap;
}
.seg-popover-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.seg-popover-name { font-weight: 600; }
.seg-popover-score { font-weight: 700; }
.seg-popover-pts { color: var(--text-secondary); }

/* Score scale legend */
.score-scale {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
  font-size: 11px;
  color: var(--text-secondary);
}
.score-scale span::before {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}
.scale-fail::before { background: var(--fail); }
.scale-average::before { background: var(--average); }
.scale-pass::before { background: var(--pass); }

/* Categories */
.category {
  padding: 24px 0 16px;
  border-bottom: 1px solid var(--border);
}
.category:last-child { border-bottom: none; }
.category-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}
.category-title {
  font-size: 18px;
  font-weight: 600;
}
.category-title.pass { color: var(--pass-text); }
.category-title.average { color: var(--average-text); }
.category-title.fail { color: var(--fail-text); }
.category-score {
  font-size: 14px;
  font-weight: 700;
}
.category-score.pass { color: var(--pass-text); }
.category-score.average { color: var(--average-text); }
.category-score.fail { color: var(--fail-text); }

/* Audit rows */
.audit-row {
  display: flex;
  align-items: baseline;
  padding: 8px 0;
  border-top: 1px solid #f0f0f0;
  font-size: 13px;
  gap: 8px;
}
.audit-icon {
  width: 18px;
  flex-shrink: 0;
  text-align: center;
  font-size: 12px;
}
.audit-icon.good { color: var(--pass); }
.audit-icon.warn { color: var(--average); }
.audit-icon.fail { color: var(--fail); }
.audit-icon.neutral { color: var(--text-secondary); }
.audit-name {
  font-weight: 500;
  min-width: 180px;
  flex-shrink: 0;
}
.audit-detail {
  flex: 1;
  color: var(--text-secondary);
}
.audit-score {
  color: var(--text-secondary);
  white-space: nowrap;
  text-align: right;
  min-width: 44px;
}

/* Recommendations */
.recs-section {
  padding: 24px 0 16px;
  border-top: 1px solid var(--border);
}
.recs-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
}
.rec-group {
  margin-bottom: 20px;
}
.rec-group-name {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--text-secondary);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2px;
}
.rec-row {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 13px;
}
.rec-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
  letter-spacing: 0.3px;
}
.priority-high .rec-tag { background: #fce8e6; color: var(--fail-text); }
.priority-med .rec-tag { background: #fef7e0; color: var(--average-text); }
.priority-low .rec-tag { background: #f1f3f4; color: var(--text-secondary); }
.rec-factor {
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
.rec-text { color: var(--text-secondary); }

/* Footer */
.footer {
  padding: 16px 0;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 600px) {
  .report { padding: 0 16px; }
  .gauges-row { gap: 4px; }
  .gauge-item { width: 80px; padding: 8px 4px; }
  .audit-row { flex-wrap: wrap; }
  .audit-name { min-width: 140px; }
  .rec-row { flex-wrap: wrap; }
}
</style>
</head>
<body>

<div class="topbar">
  <span class="topbar-title">AI SEO Audit</span>
  <span class="topbar-url">${escapeHtml(result.url)}</span>
</div>

<div class="report">
  <div class="gauges-row">
    ${gauges}
  </div>

  <div class="overall">
    ${overallGauge}
  </div>

  ${sections}

  ${recsHtml}

  <div class="footer">
    <span>Generated by aiseo-audit v${escapeHtml(result.meta.version)}</span>
    <span>${escapeHtml(result.analyzedAt)} &middot; ${result.meta.analysisDurationMs}ms</span>
  </div>
</div>

</body>
</html>`;
}
