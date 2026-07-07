import { createClient, type Client } from "@libsql/client";
// schema.sql is the single source of truth (also piped into turso on deploy)
import schema from "../schema.sql" with { type: "text" };

export function makeClient(url: string, authToken?: string): Client {
  return createClient({ url, authToken });
}

export async function applySchema(db: Client): Promise<void> {
  await db.executeMultiple(schema);
}
