export const DEFAULT_TIMEOUT = 45000;
export const DEFAULT_USER_AGENT = "GEOAudit/0.1.0";
export const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB

export const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
};
