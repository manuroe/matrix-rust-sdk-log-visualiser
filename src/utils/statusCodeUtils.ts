/**
 * Status code utilities for HTTP/sync request filtering.
 */

/** Special key for pending requests (no status yet) in the status filter */
export const PENDING_STATUS_KEY = 'Pending';

/**
 * Extract unique status codes from an array of requests.
 * Returns sorted status codes with 'Pending' at the end if applicable.
 *
 * @param requests - Array of requests with optional status field
 * @returns Sorted array of unique status codes
 */
export function extractAvailableStatusCodes(
  requests: Array<{ status?: string }>
): string[] {
  const codes = new Set<string>();
  let hasPending = false;

  requests.forEach((req) => {
    if (req.status) {
      codes.add(req.status);
    } else {
      hasPending = true;
    }
  });

  // Sort numeric codes, put Pending at the end
  const sortedCodes = Array.from(codes).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  if (hasPending) {
    sortedCodes.push(PENDING_STATUS_KEY);
  }

  return sortedCodes;
}
