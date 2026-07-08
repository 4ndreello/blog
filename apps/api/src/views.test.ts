import { expect, test, describe, afterEach } from "bun:test";
import { visitorHash, isValidSlug } from "./visitor";
import { makeClient, applySchema } from "./db";
import { getCount, recordView } from "./views";
import { tmpdir } from "node:os";
import { rmSync } from "node:fs";

describe("isValidSlug", () => {
  test("accepts kebab slug", () => {
    expect(isValidSlug("my-first-note")).toBe(true);
  });
  test("rejects uppercase, spaces, slashes, empty", () => {
    expect(isValidSlug("My Note")).toBe(false);
    expect(isValidSlug("a/b")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

const TEST_SECRET = "test-secret-pepper";

describe("visitorHash", () => {
  test("is deterministic and hides raw ip", async () => {
    const a = await visitorHash("1.2.3.4", "UA", TEST_SECRET);
    const b = await visitorHash("1.2.3.4", "UA", TEST_SECRET);
    expect(a).toBe(b);
    expect(a).not.toContain("1.2.3.4");
    expect(a).toHaveLength(64); // hmac-sha256 hex
  });

  test("depends on the secret", async () => {
    const a = await visitorHash("1.2.3.4", "UA", TEST_SECRET);
    const b = await visitorHash("1.2.3.4", "UA", "different-secret");
    expect(a).not.toBe(b);
  });
});

let lastDbPath: string | undefined;

async function freshDb() {
  const path = `${tmpdir()}/blog-views-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
  lastDbPath = path;
  const db = makeClient(`file:${path}`);
  await applySchema(db);
  return db;
}

afterEach(() => {
  if (lastDbPath) {
    try {
      rmSync(lastDbPath);
    } catch {
      // ignore cleanup failures
    }
    lastDbPath = undefined;
  }
});

describe("recordView / getCount", () => {
  test("first view increments to 1", async () => {
    const db = await freshDb();
    const n = await recordView(db, "note-a", "v1");
    expect(n).toBe(1);
    expect(await getCount(db, "note-a")).toBe(1);
  });

  test("same visitor does not double count", async () => {
    const db = await freshDb();
    await recordView(db, "note-a", "v1");
    const n = await recordView(db, "note-a", "v1");
    expect(n).toBe(1);
  });

  test("same visitor on a different slug counts separately", async () => {
    const db = await freshDb();
    await recordView(db, "note-a", "v1");
    const n = await recordView(db, "note-b", "v1");
    expect(n).toBe(1);
    expect(await getCount(db, "note-a")).toBe(1);
    expect(await getCount(db, "note-b")).toBe(1);
  });

  test("different visitors both count", async () => {
    const db = await freshDb();
    await recordView(db, "note-a", "v1");
    const n = await recordView(db, "note-a", "v2");
    expect(n).toBe(2);
  });

  test("getCount is 0 for unseen slug", async () => {
    const db = await freshDb();
    expect(await getCount(db, "nope")).toBe(0);
  });
});
