const MAX_SLUG_LENGTH = 120;

export function normalizeUrl(input: string): string {
  const parsed = new URL(assumeHttps(input.trim()));
  parsed.pathname = withoutTrailingSlashes(parsed.pathname);
  return serializeWithoutLoneRootSlash(parsed);
}

export function isValidUrl(input: string): boolean {
  try {
    normalizeUrl(input);
    return true;
  } catch {
    return false;
  }
}

export function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function isSameSite(hostA: string, hostB: string): boolean {
  const a = hostA.toLowerCase();
  const b = hostB.toLowerCase();
  return a === b || isSubdomainOf(a, b) || isSubdomainOf(b, a);
}

export function originOf(url: string): string {
  return new URL(normalizeUrl(url)).origin;
}

export function slugifyUrl(input: string): string {
  const parsed = new URL(normalizeUrl(input));
  return `${parsed.hostname}${parsed.pathname}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");
}

function assumeHttps(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function withoutTrailingSlashes(pathname: string): string {
  return pathname.replace(/\/+$/, "");
}

function serializeWithoutLoneRootSlash(parsed: URL): string {
  const serialized = parsed.toString();
  const isBareOrigin = !parsed.search && !parsed.hash;
  return isBareOrigin ? serialized.replace(/\/$/, "") : serialized;
}

function isSubdomainOf(host: string, parent: string): boolean {
  return host.endsWith(`.${parent}`);
}
