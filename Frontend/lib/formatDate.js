/**
 * Deterministic date formatting.
 *
 * WHY THIS EXISTS: calling `date.toLocaleString()` with no arguments makes the
 * output depend on the runtime's locale AND timezone. The server rendered
 * "29/9/2026, 9:30:41 am" while the browser rendered "9/29/2026, 9:30:41 AM",
 * React threw a hydration mismatch, discarded the server tree and rebuilt the
 * page on the client. It was happening on every page with a timestamp, and it
 * showed up in the browser as a Next.js "1 Issue" overlay.
 *
 * The fix is to never let locale or timezone be implicit:
 *   - LOCALE is pinned, so the server and the browser always agree.
 *   - TIME_ZONE defaults to UTC, for the same reason. UTC is also the right
 *     default for provenance (audit and activity times are facts about a
 *     record, not about the reader's wall clock), and it is labelled so no one
 *     mistakes it for local time.
 *
 * Anything that is genuinely a LOCAL time for the reader — an appointment, a
 * due mission — must pass the timezone it is actually stored in, so the value
 * shown is the clinically correct one rather than the server's guess.
 */

const LOCALE = "en-GB";

const DEFAULT_TIME_ZONE = "UTC";

function toDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "29 Sep 2026, 09:30" — compact, unambiguous, sortable. */
export function formatDateTime(value, { timeZone = DEFAULT_TIME_ZONE } = {}) {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

/** "29 Sep 2026" */
export function formatDate(value, { timeZone = DEFAULT_TIME_ZONE } = {}) {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(date);
}

/** "09:30" */
export function formatTime(value, { timeZone = DEFAULT_TIME_ZONE } = {}) {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

/** "29 Sep 2026, 09:30 UTC" — for provenance where the zone must be explicit. */
export function formatDateTimeUtc(value) {
  const date = toDate(value);
  if (!date) return "—";
  return `${formatDateTime(date)} UTC`;
}

/**
 * A local reading of a stored instant, rendered only on the client.
 *
 * Use this when the time must be shown in the READER's own zone rather than a
 * fixed one. It returns "" during server render and on the first client paint,
 * then the real value — so there is nothing to mismatch, and no layout shift
 * beyond the single line it replaces.
 */
export function formatLocal(value, options) {
  if (typeof window === "undefined") return "";
  const date = toDate(value);
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      ...options,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
