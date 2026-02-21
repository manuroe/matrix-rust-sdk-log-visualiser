/**
 * Extract the relative path from a full URL.
 * e.g., https://example.com/path?query -> /path?query
 */
export function extractRelativeUri(uri: string): string {
  try {
    const url = new URL(uri);
    return url.pathname + url.search + url.hash;
  } catch {
    // If not a valid URL, check if it starts with http:// or https://
    const match = uri.match(/^https?:\/\/[^/]+(.*)$/);
    return match ? match[1] || '/' : uri;
  }
}

/**
 * Find the longest common prefix among a list of URIs.
 * Returns prefix up to the last `/` to avoid breaking path segments.
 */
export function findCommonUriPrefix(uris: string[]): string {
  if (uris.length === 0) return '';

  // Extract relative paths first
  const paths = uris.map(extractRelativeUri);

  // Find lexicographically smallest and largest paths
  let minPath = paths[0];
  let maxPath = paths[0];
  for (let i = 1; i < paths.length; i++) {
    const current = paths[i];
    if (current < minPath) minPath = current;
    if (current > maxPath) maxPath = current;
  }

  // Common prefix of all paths is the common prefix of minPath and maxPath
  const limit = Math.min(minPath.length, maxPath.length);
  let i = 0;
  while (i < limit && minPath[i] === maxPath[i]) {
    i++;
  }
  const commonPrefix = minPath.slice(0, i);

  // Only return prefix up to the last `/` to avoid breaking path segments
  const lastSlash = commonPrefix.lastIndexOf('/');
  return lastSlash > 0 ? commonPrefix.substring(0, lastSlash) : '';
}

/**
 * Strip a common prefix from a URI for shorter display.
 */
export function stripCommonPrefix(uri: string, prefix: string): string {
  if (!prefix || !uri.startsWith(prefix)) return uri;
  return uri.substring(prefix.length) || '/';
}
