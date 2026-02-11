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
