import { expect, test, describe } from "bun:test";
import { visitorHash, isValidSlug, utcDay } from "./visitor";

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
