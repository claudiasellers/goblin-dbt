/**
 * Closing the loop on "At the next opportunity today".
 * Pure helpers (no React, no network) so they can be unit-tested.
 */

export type DueWindow = "hour" | "afternoon" | "evening" | "unsure";

const HOUR = 60 * 60 * 1000;

/**
 * Turn a one-tap "when is the next chance?" answer into a check-in time.
 * Local time of day; if the named part of the day has already passed,
 * fall back to two hours from now rather than silently rolling to tomorrow.
 */
export function dueAtFor(window: DueWindow, now: Date = new Date()): Date {
  const at = (h: number) => {
    const d = new Date(now);
    d.setHours(h, 0, 0, 0);
    return d;
  };
  switch (window) {
    case "hour":
      return new Date(now.getTime() + HOUR);
    case "afternoon": {
      const t = at(16);
      return t.getTime() - now.getTime() >= HOUR ? t : new Date(now.getTime() + 2 * HOUR);
    }
    case "evening": {
      const t = at(20);
      return t.getTime() - now.getTime() >= HOUR ? t : new Date(now.getTime() + 2 * HOUR);
    }
    default:
      return new Date(now.getTime() + 3 * HOUR);
  }
}

/** "When this urge shows up again" has no clock; check in the next day. */
export function dueAtForNextTime(now: Date = new Date()): Date {
  return new Date(now.getTime() + 24 * HOUR);
}

export type FollowUpState = "upcoming" | "due" | "stale";

/** Due once the time passes; stale 36h after that (gentle, non-scored card). */
export function followUpState(dueAt: string, now: Date = new Date()): FollowUpState {
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(due)) return "stale";
  if (now.getTime() < due) return "upcoming";
  if (now.getTime() - due > 36 * HOUR) return "stale";
  return "due";
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/**
 * A calendar reminder that fires even when the app is closed.
 * Content-free by design: no emotion, urge, or action text leaves the app.
 */
export function buildFollowUpIcs(opts: {
  uid: string;
  start: Date;
  title: string;
  body: string;
  url: string;
  now?: Date;
}): string {
  const end = new Date(opts.start.getTime() + 10 * 60 * 1000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Goblin DBT//Opposite Action follow-up//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@goblin-dbt`,
    `DTSTAMP:${icsDate(opts.now ?? new Date())}`,
    `DTSTART:${icsDate(opts.start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(opts.title)}`,
    `DESCRIPTION:${icsEscape(`${opts.body}\n${opts.url}`)}`,
    `URL:${opts.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(opts.title)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Deep link back into the follow-up for a saved session (HashRouter). */
export function followUpUrl(sessionId: string, base: string = `${window.location.origin}${window.location.pathname}`): string {
  return `${base}#/tool/opposite-action?followUp=${encodeURIComponent(sessionId)}`;
}
