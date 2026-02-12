import type { CheerioAPI } from "cheerio";
import { z } from "zod";

export const PageStatsSchema = z.object({
  wordCount: z.number(),
  sentenceCount: z.number(),
  paragraphCount: z.number(),
  headingCount: z.number(),
  h1Count: z.number(),
  h2Count: z.number(),
  h3Count: z.number(),
  linkCount: z.number(),
  externalLinkCount: z.number(),
  imageCount: z.number(),
  imagesWithAlt: z.number(),
  listCount: z.number(),
  listItemCount: z.number(),
  tableCount: z.number(),
  boilerplateRatio: z.number().min(0).max(1),
  rawByteLength: z.number(),
  cleanTextLength: z.number(),
});

export const ExtractedPageDataSchema = z.object({
  url: z.string(),
  html: z.string(),
  cleanText: z.string(),
  title: z.string(),
  metaDescription: z.string(),
  stats: PageStatsSchema,
});

export type PageStatsType = z.infer<typeof PageStatsSchema>;
export type ExtractedPageDataType = z.infer<typeof ExtractedPageDataSchema>;

export interface ExtractedPageType extends ExtractedPageDataType {
  $: CheerioAPI;
}
