// slug must be kebab: lowercase alphanumerics + hyphen
const SLUG_RE = /^[a-z0-9-]+$/;
export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && SLUG_RE.test(slug);
}

// hmac-sha256 hex of ip|ua using a server-side secret/pepper.
// raw ip is never stored and the secret makes the hash resistant to offline enumeration.
export async function visitorHash(
  ip: string,
  ua: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${ip}|${ua}`),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
