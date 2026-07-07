// utc date as YYYY-MM-DD
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

// slug must be kebab: lowercase alphanumerics + hyphen
const SLUG_RE = /^[a-z0-9-]+$/;
export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && SLUG_RE.test(slug);
}

// sha256 hex of ip+ua+day. raw ip never stored.
export async function visitorHash(ip: string, ua: string, day: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|${ua}|${day}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
