import { expect, test, describe } from "bun:test";
import { visitorHash, isValidSlug, utcDay } from "./visitor";
import { makeClient, applySchema } from "./db";
import { getCount, recordView } from "./views";

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

describe("utcDay", () => {
  test("formats YYYY-MM-DD in UTC", () => {
    expect(utcDay(new Date("2026-07-07T23:30:00Z"))).toBe("2026-07-07");
  });
});

describe("visitorHash", () => {
  test("is deterministic and hides raw ip", async () => {
    const a = await visitorHash("1.2.3.4", "UA", "2026-07-07");
    const b = await visitorHash("1.2.3.4", "UA", "2026-07-07");
    expect(a).toBe(b);
    expect(a).not.toContain("1.2.3.4");
    expect(a).toHaveLength(64); // sha256 hex
  });
  test("differs across day", async () => {
    const a = await visitorHash("1.2.3.4", "UA", "2026-07-07");
    const b = await visitorHash("1.2.3.4", "UA", "2026-07-08");
    expect(a).not.toBe(b);
  });
});

async function freshDb() {
  const db = makeClient(":memory:");
  await applySchema(db);
  return db;
}

describe("recordView / getCount", () => {
  test("first view increments to 1", async () => {
    const db = await freshDb();
    const n = await recordView(db, "note-a", "v1", "2026-07-07");
    expect(n).toBe(1);
    expect(await getCount(db, "note-a")).toBe(1);
  });

  test("same visitor same day does not double count", async () => {
    const db = await freshDb();
    await recordView(db, "note-a", "v1", "2026-07-07");
    const n = await recordView(db, "note-a", "v1", "2026-07-07");
    expect(n).toBe(1);
  });

  test("same visitor next day counts again", async () => {
    const db = await freshDb();
    await recordView(db, "note-a", "v1", "2026-07-07");
    const n = await recordView(db, "note-a", "v1", "2026-07-08");
    expect(n).toBe(2);
  });

  test("different visitors both count", async () => {
    const db = await freshDb();
    await recordView(db, "note-a", "v1", "2026-07-07");
    const n = await recordView(db, "note-a", "v2", "2026-07-07");
    expect(n).toBe(2);
  });

  test("getCount is 0 for unseen slug", async () => {
    const db = await freshDb();
    expect(await getCount(db, "nope")).toBe(0);
  });
});
