import { createClient, type Client } from "@libsql/client";
// schema.sql is the single source of truth (also piped into turso on deploy)
import schema from "../schema.sql" with { type: "text" };
import migration from "../migration.sql" with { type: "text" };

export function makeClient(url: string, authToken?: string): Client {
  return createClient({ url, authToken });
}

export async function applySchema(db: Client): Promise<void> {
  await db.executeMultiple(schema);

  const info = await db.execute({
    sql: "SELECT name FROM pragma_table_info('view_events') WHERE name = 'day'",
    args: [],
  });
  if (info.rows.length > 0) {
    await db.executeMultiple(migration);
  }
}
