/** localStorage key prefix for tab-log entries. */
const KEY_PREFIX = 'rageshake-tablog-';

/** Maximum age of a stored tab-log entry in milliseconds (10 minutes). */
const MAX_AGE_MS = 10 * 60 * 1000;

interface TabLogEntry {
  readonly text: string;
  readonly createdAt: number;
}

/**
 * Stores the given log text in localStorage under a randomly-generated UUID
 * key so it can be transferred to a newly-opened tab via the `tabLog` URL
 * parameter.
 *
 * The entry is stamped with the current time; {@link loadAndClearTabLog} will
 * reject it if more than 10 minutes pass before the new tab reads it.
 *
 * @returns The UUID to embed in the new tab's URL, or `null` when storage
 *          failed (e.g. `QuotaExceededError`).
 *
 * @example
 * const uuid = storeTabLog(rawLogText);
 * if (uuid) {
 *   const url = new URL(window.location.href);
 *   url.hash = `/logs?tabLog=${uuid}`;
 *   window.open(url.toString(), '_blank');
 * }
 */
export function storeTabLog(text: string): string | null {
  const uuid = crypto.randomUUID();
  const key = `${KEY_PREFIX}${uuid}`;
  const entry: TabLogEntry = { text, createdAt: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(entry));
    return uuid;
  } catch {
    return null;
  }
}

/**
 * Reads and immediately removes the log text stored under the given UUID.
 *
 * Returns `null` when the entry is missing (never written or tab crashed) or
 * when it is older than 10 minutes. In both cases the localStorage key is
 * deleted (if present) to prevent orphaned entries from accumulating.
 *
 * @example
 * const text = loadAndClearTabLog(uuid);
 * if (text) {
 *   const result = parseLogFile(text);
 *   loadLogParserResult(result);
 * }
 */
export function loadAndClearTabLog(uuid: string): string | null {
  const key = `${KEY_PREFIX}${uuid}`;
  const raw = localStorage.getItem(key);
  localStorage.removeItem(key);

  if (!raw) return null;

  let entry: TabLogEntry;
  try {
    entry = JSON.parse(raw) as TabLogEntry;
  } catch {
    return null;
  }

  if (typeof entry.text !== 'string' || typeof entry.createdAt !== 'number') return null;
  if (Date.now() - entry.createdAt > MAX_AGE_MS) return null;

  return entry.text;
}
