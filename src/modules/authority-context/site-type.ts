import type { CheerioAPI } from "cheerio";

export type SiteTypeResultType = {
  forumLike: boolean;
  signals: string[];
};

const FORUM_SCHEMA_TYPES = new Set([
  "DiscussionForumPosting",
  "QAPage",
  "SocialMediaPosting",
]);

const FORUM_GENERATOR = /discourse|phpbb|vbulletin|xenforo|flarum/i;
const FORUM_URL_SEGMENT = /\/(?:forum|thread|community)(?:\/|$)|\/t\//i;

export function detectSiteType(
  $: CheerioAPI,
  url: string,
  structuredDataTypes: string[],
): SiteTypeResultType {
  const signals: string[] = [];

  const forumSchema = structuredDataTypes.find((type) =>
    FORUM_SCHEMA_TYPES.has(type),
  );
  if (forumSchema) signals.push(`${forumSchema} schema`);

  const generator = $('meta[name="generator"]').attr("content") ?? "";
  if (FORUM_GENERATOR.test(generator)) signals.push(`${generator} generator`);

  if (FORUM_URL_SEGMENT.test(url)) signals.push("forum-style URL path");

  return { forumLike: signals.length > 0, signals };
}
