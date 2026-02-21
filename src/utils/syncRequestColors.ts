import type { HttpRequest } from '../types/log.types';
import type { SyncRequest } from '../types/log.types';
import { getHttpStatusColor } from './httpStatusColors';

/**
 * Returns the waterfall bar color for a /sync request.
 *
 * - Catchup requests (timeout=0) with a 2xx response use a distinct yellow-green
 *   to highlight how quickly the app caught up.
 * - Long-poll requests (timeout≥30000ms) with a 2xx response use a muted slate
 *   color, signaling they are routine background activity.
 * - All other status codes (4xx, 5xx, incomplete, …) fall back to the standard
 *   HTTP status color so errors and failures remain prominent.
 */
export function getSyncRequestBarColor(req: HttpRequest, defaultColor: string): string {
  const sync = req as SyncRequest;
  const statusCode = req.status ? req.status.split(' ')[0] : '';
  const is2xx = statusCode.startsWith('2');

  if (is2xx) {
    if (sync.timeout === 0) {
      return 'var(--sync-catchup-success)';
    }
    if (sync.timeout !== undefined && sync.timeout >= 30000) {
      return 'var(--sync-longpoll-success)';
    }
  }

  // Incomplete or non-2xx: use the standard HTTP status color
  return defaultColor ?? getHttpStatusColor(statusCode);
}
