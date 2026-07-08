import type { Client } from "@libsql/client";

// current total for a slug, 0 if none.
export async function getCount(db: Client, slug: string): Promise<number> {
  const rs = await db.execute({
    sql: "SELECT count FROM views WHERE slug = ?",
    args: [slug],
  });
  return rs.rows.length ? Number(rs.rows[0].count) : 0;
}

// dedup-insert the event; increment total only if this visitor has not been seen before.
// returns the current total after the operation.
export async function recordView(
  db: Client,
  slug: string,
  visitor: string,
): Promise<number> {
  const tx = await db.transaction("write");
  try {
    const ins = await tx.execute({
      sql: "INSERT OR IGNORE INTO view_events (slug, visitor) VALUES (?, ?)",
      args: [slug, visitor],
    });
    if (ins.rowsAffected > 0) {
      await tx.execute({
        sql: `INSERT INTO views (slug, count) VALUES (?, 1)
              ON CONFLICT(slug) DO UPDATE SET count = count + 1`,
        args: [slug],
      });
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
  return getCount(db, slug);
}
