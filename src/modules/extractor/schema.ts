import type { CheerioAPI } from "cheerio";

export type PageStatsType = {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  headingCount: number;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  linkCount: number;
  externalLinkCount: number;
  imageCount: number;
  imagesWithAlt: number;
  listCount: number;
  listItemCount: number;
  tableCount: number;
  boilerplateRatio: number;
  rawByteLength: number;
  cleanTextLength: number;
};

export type ExternalLinkType = {
  url: string;
  text: string;
};

export type ExtractedPageType = {
  url: string;
  html: string;
  cleanText: string;
  title: string;
  metaDescription: string;
  stats: PageStatsType;
  $: CheerioAPI;
  externalLinks: ExternalLinkType[];
};
