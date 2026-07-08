import { Hono } from "hono";
import { cors } from "hono/cors";
import { makeClient, applySchema } from "./db";
import { getCount, recordView } from "./views";
import { visitorHash, isValidSlug } from "./visitor";

const db = makeClient(process.env.TURSO_URL!, process.env.TURSO_TOKEN);
await applySchema(db);

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.ALLOWED_ORIGIN ?? "*",
    allowMethods: ["GET", "POST"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

app.get("/views/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) return c.json({ error: "bad slug" }, 400);
  try {
    return c.json({ slug, count: await getCount(db, slug) });
  } catch {
    return c.json({ error: "unavailable" }, 503);
  }
});

app.post("/views/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) return c.json({ error: "bad slug" }, 400);
  const ip = (c.req.header("x-forwarded-for") ?? "0.0.0.0").split(",")[0].trim();
  const ua = c.req.header("user-agent") ?? "";
  try {
    const visitor = await visitorHash(ip, ua);
    return c.json({ slug, count: await recordView(db, slug, visitor) });
  } catch {
    return c.json({ error: "unavailable" }, 503);
  }
});

const port = Number(process.env.PORT ?? 8080);
export default { port, fetch: app.fetch };
