export function normalizeUrl(input: string): string {
  let url = input.trim();

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const parsed = new URL(url);
  return parsed.toString().replace(/\/+$/, "");
}

export function isValidUrl(input: string): boolean {
  try {
    const url = normalizeUrl(input);
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function slugifyUrl(input: string): string {
  const normalized = normalizeUrl(input);
  const parsed = new URL(normalized);
  const hostAndPath = `${parsed.hostname}${parsed.pathname}`;
  return hostAndPath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
