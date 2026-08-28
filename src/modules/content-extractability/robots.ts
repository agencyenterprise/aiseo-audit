import type { CrawlerAccessResultType } from "../audits/schema.js";

export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "meta-externalagent",
];

const FULL_SITE_PATHS = new Set(["/", "*", "/*"]);

type RobotRule = { type: "allow" | "disallow"; path: string };
type RobotGroup = { agents: string[]; rules: RobotRule[] };

export function checkCrawlerAccess(
  robotsTxt: string | null,
): CrawlerAccessResultType {
  if (!robotsTxt) {
    return { allowed: [], blocked: [], unknown: [...AI_CRAWLERS] };
  }

  const groups = parseRobotGroups(robotsTxt);
  const allowed: string[] = [];
  const blocked: string[] = [];
  const unknown: string[] = [];
  const partiallyBlocked: string[] = [];

  for (const crawler of AI_CRAWLERS) {
    const applicableRules = rulesApplyingTo(groups, crawler.toLowerCase());

    if (applicableRules.length === 0) {
      unknown.push(crawler);
      continue;
    }

    if (resolvesPathAsBlocked(applicableRules, "/")) {
      blocked.push(crawler);
      continue;
    }

    allowed.push(crawler);
    for (const path of findPartialBlocks(applicableRules)) {
      const entry = `${crawler}: ${path}`;
      if (!partiallyBlocked.includes(entry)) {
        partiallyBlocked.push(entry);
      }
    }
  }

  return {
    allowed,
    blocked,
    unknown,
    ...(partiallyBlocked.length > 0 && { partiallyBlocked }),
  };
}

function parseRobotGroups(robotsTxt: string): RobotGroup[] {
  const groups: RobotGroup[] = [];
  let current: RobotGroup | null = null;

  for (const rawLine of robotsTxt.split("\n")) {
    const line = withoutComment(rawLine).trim();
    if (!line) continue;

    const field = fieldNameOf(line);
    const value = fieldValueOf(line);
    if (field === null) continue;

    if (field === "user-agent") {
      if (startsNewGroup(current)) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current!.agents.push(value.toLowerCase());
    } else if (field === "disallow" || field === "allow") {
      current?.rules.push({ type: field, path: value });
    }
  }

  return groups;
}

function withoutComment(line: string): string {
  return line.split("#")[0];
}

function fieldNameOf(line: string): string | null {
  const colonAt = line.indexOf(":");
  return colonAt === -1 ? null : line.slice(0, colonAt).trim().toLowerCase();
}

function fieldValueOf(line: string): string {
  const colonAt = line.indexOf(":");
  return colonAt === -1 ? "" : line.slice(colonAt + 1).trim();
}

function startsNewGroup(current: RobotGroup | null): boolean {
  return current === null || current.rules.length > 0;
}

function rulesApplyingTo(
  groups: RobotGroup[],
  crawlerLower: string,
): RobotRule[] {
  const specific: RobotRule[] = [];
  const wildcard: RobotRule[] = [];

  for (const group of groups) {
    if (group.agents.includes(crawlerLower)) specific.push(...group.rules);
    else if (group.agents.includes("*")) wildcard.push(...group.rules);
  }

  return specific.length > 0 ? specific : wildcard;
}

function resolvesPathAsBlocked(rules: RobotRule[], path: string): boolean {
  let bestMatchLength = -1;
  let bestMatchIsDisallow = false;

  for (const rule of rules) {
    if (ruleMatchesNothing(rule) || !ruleMatchesPath(rule.path, path)) {
      continue;
    }

    if (rule.path.length > bestMatchLength) {
      bestMatchLength = rule.path.length;
      bestMatchIsDisallow = rule.type === "disallow";
    } else if (rule.path.length === bestMatchLength && rule.type === "allow") {
      bestMatchIsDisallow = false;
    }
  }

  return bestMatchLength >= 0 && bestMatchIsDisallow;
}

function ruleMatchesNothing(rule: RobotRule): boolean {
  return rule.path === "";
}

function ruleMatchesPath(rulePath: string, path: string): boolean {
  const anchoredToEnd = rulePath.endsWith("$");
  const pattern = anchoredToEnd ? rulePath.slice(0, -1) : rulePath;
  const escapedWithWildcards = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escapedWithWildcards}${anchoredToEnd ? "$" : ""}`).test(
    path,
  );
}

function findPartialBlocks(rules: RobotRule[]): string[] {
  return rules
    .filter(
      (rule) =>
        rule.type === "disallow" &&
        rule.path !== "" &&
        !FULL_SITE_PATHS.has(rule.path) &&
        !isCancelledByIdenticalAllow(rule, rules),
    )
    .map((rule) => rule.path);
}

function isCancelledByIdenticalAllow(
  disallow: RobotRule,
  rules: RobotRule[],
): boolean {
  return rules.some(
    (rule) => rule.type === "allow" && rule.path === disallow.path,
  );
}
