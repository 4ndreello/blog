import { createClient, type Client } from "@libsql/client";

export function makeClient(url: string, authToken?: string): Client {
  return createClient({ url, authToken });
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS views (
  slug  TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS view_events (
  slug    TEXT NOT NULL,
  visitor TEXT NOT NULL,
  day     TEXT NOT NULL,
  PRIMARY KEY (slug, visitor, day)
);`;

export async function applySchema(db: Client): Promise<void> {
  await db.executeMultiple(SCHEMA);
}
