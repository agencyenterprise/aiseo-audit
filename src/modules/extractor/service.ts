import * as cheerio from 'cheerio';
import { removeBoilerplate } from './support/boilerplate.js';
import { extractCleanText } from './support/text.js';
import { countWords, countSentences } from '../../utils/strings.js';
import { getDomain } from '../../utils/url.js';
import type { ExtractedPage, PageStats } from './schema.js';

export function extractPage(html: string, url: string): ExtractedPage {
  const $ = cheerio.load(html);

  const title = $('title').text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() || '';

  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() || '';

  const rawText = $('body').text().replace(/\s+/g, ' ').trim();
  const rawByteLength = Buffer.byteLength(html, 'utf-8');

  // Count stats before boilerplate removal
  const h1Count = $('h1').length;
  const h2Count = $('h2').length;
  const h3Count = $('h3').length;
  const headingCount = h1Count + h2Count + h3Count + $('h4, h5, h6').length;
  const linkCount = $('a[href]').length;
  const imageCount = $('img').length;
  const listCount = $('ul, ol').length;
  const listItemCount = $('li').length;
  const tableCount = $('table').length;
  const paragraphCount = $('p').length;

  // Count images with alt
  let imagesWithAlt = 0;
  $('img').each((_, el) => {
    if ($(el).attr('alt')) imagesWithAlt++;
  });

  // Count external links
  const pageDomain = getDomain(url);
  let externalLinkCount = 0;
  $('a[href^="http"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const linkDomain = getDomain(href);
        if (linkDomain !== pageDomain) externalLinkCount++;
      } catch {}
    }
  });

  // Remove boilerplate for clean text
  const $clean = cheerio.load(html);
  removeBoilerplate($clean);
  const cleanText = extractCleanText($clean);
  const cleanTextLength = cleanText.length;

  const boilerplateRatio =
    rawText.length > 0
      ? Math.max(0, Math.min(1, 1 - cleanTextLength / rawText.length))
      : 0;

  const stats: PageStats = {
    wordCount: countWords(cleanText),
    sentenceCount: countSentences(cleanText),
    paragraphCount,
    headingCount,
    h1Count,
    h2Count,
    h3Count,
    linkCount,
    externalLinkCount,
    imageCount,
    imagesWithAlt,
    listCount,
    listItemCount,
    tableCount,
    boilerplateRatio,
    rawByteLength,
    cleanTextLength,
  };

  return {
    url,
    html,
    cleanText,
    title,
    metaDescription,
    stats,
    $,
  };
}
