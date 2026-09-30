/**
 * Quiet hours (Me → My body): local "HH:MM" start and end, possibly across midnight. In-tab
 * reminders don't fire inside the window; the Today card still shows when the app is opened.
 */
export interface QuietWindow { start: string; end: string }

const minutes = (hhmm: string): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.NaN;
};

export function inQuietHours(at: Date, q: QuietWindow | null | undefined): boolean {
  if (!q) return false;
  const s = minutes(q.start);
  const e = minutes(q.end);
  if (Number.isNaN(s) || Number.isNaN(e) || s === e) return false;
  const n = at.getHours() * 60 + at.getMinutes();
  return s < e ? n >= s && n < e : n >= s || n < e;
}
