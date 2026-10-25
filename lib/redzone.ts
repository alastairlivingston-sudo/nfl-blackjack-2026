/**
 * The NFL RedZone window: Sunday afternoon, when the 1pm and 4pm ET slates are
 * live and touchdowns land every few minutes. The scoreboard auto-refreshes
 * every REDZONE_REFRESH_MS inside it (see app/scoreboard/LiveRefresh.tsx and
 * app/api/live-refresh/route.ts); outside it the daily cron is enough.
 *
 * Judged in US Eastern time so it tracks kickoffs across both DST changes —
 * the UK and US switch clocks on different weekends, so a fixed UK window
 * would drift by an hour twice a season. Pure and timezone-safe, so the client
 * (to decide whether to poll) and the server (to decide whether to do work)
 * share one definition.
 */
export const REDZONE_TIME_ZONE = "America/New_York";

/** Minutes after midnight ET: a few minutes before 1pm kickoffs → after the late games wrap. */
const WINDOW_START_MIN = 12 * 60 + 55;
const WINDOW_END_MIN = 20 * 60 + 30;

/** How often stats are pulled from Sleeper while the window is open. */
export const REDZONE_REFRESH_MS = 10 * 60 * 1000;

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: REDZONE_TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function isRedZoneWindow(now: Date = new Date()): boolean {
  const parts = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]));
  if (parts.weekday !== "Sun") return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= WINDOW_START_MIN && minutes < WINDOW_END_MIN;
}
