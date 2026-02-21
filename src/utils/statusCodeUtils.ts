/**
 * Status code utilities for HTTP/sync request filtering.
 */

/** Special key for incomplete requests (no status yet) in the status filter */
export const INCOMPLETE_STATUS_KEY = 'Incomplete';

/**
 * Extract unique status codes from an array of requests.
 * Returns sorted status codes with 'Incomplete' at the end if applicable.
 *
 * @param requests - Array of requests with optional status field
 * @returns Sorted array of unique status codes
 */
export function extractAvailableStatusCodes(
  requests: Array<{ status?: string }>
): string[] {
  const codes = new Set<string>();
  let hasIncomplete = false;

  requests.forEach((req) => {
    if (req.status) {
      codes.add(req.status);
    } else {
      hasIncomplete = true;
    }
  });

  // Sort numeric codes, put Incomplete at the end
  const sortedCodes = Array.from(codes).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  if (hasIncomplete) {
    sortedCodes.push(INCOMPLETE_STATUS_KEY);
  }

  return sortedCodes;
}
