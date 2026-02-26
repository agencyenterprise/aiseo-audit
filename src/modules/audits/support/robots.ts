import type { CrawlerAccessResultType } from "../schema.js";
import { AI_CRAWLERS } from "./patterns.js";

type RobotRule = { type: "allow" | "disallow"; path: string };
type RobotGroup = { agents: string[]; rules: RobotRule[] };

function parseRobotGroups(robotsTxt: string): RobotGroup[] {
  const groups: RobotGroup[] = [];
  let current: RobotGroup | null = null;

  for (const raw of robotsTxt.split("\n")) {
    const line = raw.split("#")[0].trim();
    if (!line) {
      current = null;
      continue;
    }

    const colonAt = line.indexOf(":");
    if (colonAt === -1) continue;

    const field = line.slice(0, colonAt).trim().toLowerCase();
    const value = line.slice(colonAt + 1).trim();

    if (field === "user-agent") {
      if (!current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (field === "disallow" || field === "allow") {
      if (current) {
        current.rules.push({ type: field, path: value });
      }
    }
  }

  return groups;
}

function matchingRulesForCrawler(
  groups: RobotGroup[],
  crawlerLower: string,
): { specific: RobotRule[]; wildcard: RobotRule[] } {
  const specific: RobotRule[] = [];
  const wildcard: RobotRule[] = [];

  for (const group of groups) {
    if (group.agents.includes(crawlerLower)) specific.push(...group.rules);
    else if (group.agents.includes("*")) wildcard.push(...group.rules);
  }

  return { specific, wildcard };
}

function resolvesPathAsBlocked(rules: RobotRule[], path: string): boolean {
  let bestMatchLength = -1;
  let bestMatchIsDisallow = false;

  for (const rule of rules) {
    const rulePath = rule.path;
    if (!rulePath || !path.startsWith(rulePath)) continue;

    if (rulePath.length > bestMatchLength) {
      bestMatchLength = rulePath.length;
      bestMatchIsDisallow = rule.type === "disallow";
    } else if (rulePath.length === bestMatchLength && rule.type === "allow") {
      bestMatchIsDisallow = false;
    }
  }

  return bestMatchLength >= 0 && bestMatchIsDisallow;
}

function findPartialBlocks(rules: RobotRule[]): string[] {
  return rules
    .filter((r) => r.type === "disallow" && r.path && r.path !== "/")
    .map((r) => r.path);
}

export function checkCrawlerAccess(
  robotsTxt: string | null,
): CrawlerAccessResultType {
  if (!robotsTxt)
    return { allowed: [], blocked: [], unknown: [...AI_CRAWLERS] };

  const groups = parseRobotGroups(robotsTxt);
  const allowed: string[] = [];
  const blocked: string[] = [];
  const unknown: string[] = [];
  const partiallyBlocked: string[] = [];

  for (const crawler of AI_CRAWLERS) {
    const crawlerLower = crawler.toLowerCase();
    const { specific, wildcard } = matchingRulesForCrawler(
      groups,
      crawlerLower,
    );

    const applicableRules = specific.length > 0 ? specific : wildcard;

    if (applicableRules.length === 0) {
      unknown.push(crawler);
      continue;
    }

    const isSiteBlocked = resolvesPathAsBlocked(applicableRules, "/");

    if (isSiteBlocked) {
      blocked.push(crawler);
    } else {
      allowed.push(crawler);

      const pathBlocks = findPartialBlocks(applicableRules);
      for (const path of pathBlocks) {
        const entry = `${crawler}: ${path}`;
        if (!partiallyBlocked.includes(entry)) {
          partiallyBlocked.push(entry);
        }
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
