import { test } from "node:test";
import assert from "node:assert/strict";
import { isLocked, lockAt } from "./lock";

test("lockAt: unset env returns null", () => {
  delete process.env.LOCK_AT;
  assert.equal(lockAt(), null);
});

test("lockAt: invalid date string returns null", () => {
  process.env.LOCK_AT = "not-a-date";
  assert.equal(lockAt(), null);
});

test("lockAt: valid ISO string parses", () => {
  process.env.LOCK_AT = "2026-09-10T00:15:00Z";
  assert.equal(lockAt()?.toISOString(), "2026-09-10T00:15:00.000Z");
});

test("isLocked: unset env is never locked", () => {
  delete process.env.LOCK_AT;
  assert.equal(isLocked(new Date("2030-01-01T00:00:00Z")), false);
});

test("isLocked: false before the deadline", () => {
  process.env.LOCK_AT = "2026-09-10T00:15:00Z";
  assert.equal(isLocked(new Date("2026-09-09T00:00:00Z")), false);
});

test("isLocked: true at and after the deadline", () => {
  process.env.LOCK_AT = "2026-09-10T00:15:00Z";
  assert.equal(isLocked(new Date("2026-09-10T00:15:00Z")), true);
  assert.equal(isLocked(new Date("2026-09-11T00:00:00Z")), true);
});
