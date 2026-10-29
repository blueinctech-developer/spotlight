/** Time-zone helpers for <input type="datetime-local"> values (no dependencies, server + client safe). */

function offsetMs(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** "2026-10-06T08:30" in `timeZone` → UTC Date. */
export function localToUtc(local: string, timeZone: string): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let utc = guess - offsetMs(guess, timeZone);
  // Second pass handles DST transitions.
  utc = guess - offsetMs(utc, timeZone);
  return new Date(utc);
}

/** UTC Date → "YYYY-MM-DDTHH:mm" as seen in `timeZone`. */
export function utcToLocal(date: Date | string | null | undefined, timeZone: string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() + offsetMs(d.getTime(), timeZone));
  return local.toISOString().slice(0, 16);
}

export function formatInZone(date: Date | string | null | undefined, timeZone: string, withTime = false): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone, day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(date));
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
