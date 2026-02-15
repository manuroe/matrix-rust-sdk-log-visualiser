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

  // Find the shortest path to limit prefix search
  const minLength = Math.min(...paths.map(p => p.length));

  let commonPrefix = '';
  for (let i = 0; i < minLength; i++) {
    const char = paths[0][i];
    if (paths.every(path => path[i] === char)) {
      commonPrefix += char;
    } else {
      break;
    }
  }

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
