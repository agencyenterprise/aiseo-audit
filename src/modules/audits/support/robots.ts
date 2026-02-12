import type { CrawlerAccessResultType } from "../schema.js";
import { AI_CRAWLERS } from "./patterns.js";

export function checkCrawlerAccess(
  robotsTxt: string | null,
): CrawlerAccessResultType {
  if (!robotsTxt)
    return { allowed: [], blocked: [], unknown: [...AI_CRAWLERS] };

  const lines = robotsTxt.split("\n").map((l) => l.trim());
  const allowed: string[] = [];
  const blocked: string[] = [];
  const unknown: string[] = [];

  for (const crawler of AI_CRAWLERS) {
    const crawlerLower = crawler.toLowerCase();
    let currentAgent = "";
    let isBlocked = false;
    let found = false;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith("user-agent:")) {
        currentAgent = lower.split(":")[1]?.trim() || "";
      } else if (currentAgent === crawlerLower || currentAgent === "*") {
        if (lower.startsWith("disallow:")) {
          const path = lower.split(":")[1]?.trim();
          if (path === "/") {
            if (currentAgent === crawlerLower) {
              isBlocked = true;
              found = true;
            } else if (currentAgent === "*" && !found) {
              isBlocked = true;
            }
          }
        } else if (lower.startsWith("allow:")) {
          if (currentAgent === crawlerLower) {
            found = true;
            isBlocked = false;
          }
        }
      }
    }

    if (found) {
      if (isBlocked) blocked.push(crawler);
      else allowed.push(crawler);
    } else if (isBlocked) {
      blocked.push(crawler);
    } else {
      unknown.push(crawler);
    }
  }

  return { allowed, blocked, unknown };
}
