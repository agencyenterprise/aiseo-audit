export function detectContentType(
  contentTypeHeader: string
): { mimeType: string; charset: string; isHtml: boolean } {
  const parts = contentTypeHeader.split(';').map(p => p.trim());
  const mimeType = parts[0]?.toLowerCase() || 'unknown';
  const charsetPart = parts.find(p => p.toLowerCase().startsWith('charset='));
  const charset = charsetPart ? charsetPart.split('=')[1]?.trim() || 'utf-8' : 'utf-8';

  const isHtml =
    mimeType === 'text/html' ||
    mimeType === 'application/xhtml+xml';

  return { mimeType, charset, isHtml };
}
