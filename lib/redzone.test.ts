import { test } from "node:test";
import assert from "node:assert/strict";
import { isRedZoneWindow } from "./redzone";

test("RZ1: open on a Sunday between 1pm and 4pm ET slates (EDT)", () => {
  // Sun 4 Oct 2026, 13:00 EDT = 17:00 UTC.
  assert.equal(isRedZoneWindow(new Date("2026-10-04T17:00:00Z")), true);
  // 16:25 EDT late window.
  assert.equal(isRedZoneWindow(new Date("2026-10-04T20:25:00Z")), true);
});

test("RZ2: closed before kickoff, after the late games, and on other days", () => {
  // Sun 12:30 EDT — before the window.
  assert.equal(isRedZoneWindow(new Date("2026-10-04T16:30:00Z")), false);
  // Sun 20:30 EDT — window has just closed.
  assert.equal(isRedZoneWindow(new Date("2026-10-05T00:30:00Z")), false);
  // Mon 1pm EDT.
  assert.equal(isRedZoneWindow(new Date("2026-10-05T17:00:00Z")), false);
  // Sat 3pm EDT.
  assert.equal(isRedZoneWindow(new Date("2026-10-03T19:00:00Z")), false);
});

test("RZ3: tracks US DST, not UK time", () => {
  // US clocks fall back on Sun 1 Nov 2026 (a week after the UK's): 13:00 EST = 18:00 UTC.
  assert.equal(isRedZoneWindow(new Date("2026-11-01T18:00:00Z")), true);
  // 17:00 UTC that day is 12:00 EST — not yet open.
  assert.equal(isRedZoneWindow(new Date("2026-11-01T17:00:00Z")), false);
  // A late Sunday in UTC terms (01:00 UTC Mon) is still Sunday 20:00 EST — open.
  assert.equal(isRedZoneWindow(new Date("2026-11-02T01:00:00Z")), true);
});
