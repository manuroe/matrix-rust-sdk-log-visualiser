/**
 * Generate a GitHub URL pointing to a specific line in a source file.
 * 
 * @param filePath The file path (e.g., "ClientProxy.swift" or "crates/matrix-sdk/src/http_client/native.rs")
 * @param lineNumber The line number in the source file
 * @returns The GitHub URL, or undefined if the file type is not recognized
 */
export function generateGitHubSourceUrl(
  filePath: string | undefined,
  lineNumber: number | undefined
): string | undefined {
  if (!filePath || !lineNumber) {
    return undefined;
  }

  if (filePath.endsWith('.swift')) {
    // If logs include a full Swift path, link directly to the file+line.
    if (filePath.includes('/')) {
      return `https://github.com/element-hq/element-x-ios/blob/main/${filePath}#L${lineNumber}`;
    }

    // If logs only include a Swift filename, fall back to repo code search.
    // GitHub cannot resolve unknown subdirectories for blob links.
    const query = encodeURIComponent(`${filePath} repo:element-hq/element-x-ios`);
    return `https://github.com/element-hq/element-x-ios/search?q=${query}&type=code`;
  }

  if (filePath.endsWith('.rs')) {
    // Rust files -> matrix-rust-sdk repo
    return `https://github.com/matrix-org/matrix-rust-sdk/blob/main/${filePath}#L${lineNumber}`;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Swift filename → full path resolution
//
// Logs often record only the bare Swift filename (e.g.
// "ClientProxy.swift:1092") without the directory component.  We need the
// full repo-relative path to build a working blob URL such as:
//   https://github.com/element-hq/element-x-ios/blob/main/
//     ElementX/Sources/Services/Client/ClientProxy.swift#L1092
//
// Strategy – GitHub Git Trees API (unauthenticated):
//   The GitHub Code Search API (/search/code) requires authentication and
//   returns HTTP 422 for anonymous requests, so it cannot be used here.
//   Instead we call the Git Trees API once per session:
//     GET /repos/element-hq/element-x-ios/git/trees/main?recursive=1
//   This returns every file path in the repo in a single JSON response and
//   works without any credentials.  We walk the tree, index every .swift
//   blob by its bare filename, and store the result in `swiftPathCache`.
//   Subsequent lookups are instant O(1) map reads.
//
// Performance / resilience:
//   • sessionStorage: on a successful fetch the full filename→path map is
//     written to sessionStorage so subsequent page loads in the same tab
//     session skip the network request entirely.
//   • AbortController timeout (3 s): if the GitHub API is slow the fetch is
//     aborted so the caller falls back to the search URL promptly.
//   • Retry: `treeFetchPromise` is reset to null after each failed attempt,
//     so the next user click will try again instead of silently giving up.
// ---------------------------------------------------------------------------

interface GitHubTreeItem {
  path?: string;
  type?: string;
}

interface GitHubTreeResponse {
  tree?: GitHubTreeItem[];
  truncated?: boolean;
}

export const SWIFT_PATH_SESSION_STORAGE_KEY = 'element-x-ios-swift-path-cache-v1';
const TREE_FETCH_TIMEOUT_MS = 3000;

// Maps bare filename (e.g. "ClientProxy.swift") -> full repo path
const swiftPathCache = new Map<string, string>();
// Promise guarding a single in-flight tree fetch; reset to null on failure so
// the next call can retry.
let treeFetchPromise: Promise<void> | null = null;
// Guards against re-reading sessionStorage more than once per page load.
let swiftCacheInitializedFromSession = false;

function loadSwiftPathCacheFromSessionStorage(): void {
  if (swiftCacheInitializedFromSession) return;
  swiftCacheInitializedFromSession = true;
  try {
    const raw = typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(SWIFT_PATH_SESSION_STORAGE_KEY)
      : null;
    if (!raw) return;
    const data = JSON.parse(raw) as Record<string, string>;
    for (const [name, path] of Object.entries(data)) {
      if (name && path && !swiftPathCache.has(name)) {
        swiftPathCache.set(name, path);
      }
    }
  } catch {
    // Ignore storage/JSON errors and fall back to empty cache.
  }
}

function saveSwiftPathCacheToSessionStorage(): void {
  try {
    if (typeof sessionStorage === 'undefined' || swiftPathCache.size === 0) return;
    const data: Record<string, string> = {};
    for (const [name, path] of swiftPathCache.entries()) {
      data[name] = path;
    }
    sessionStorage.setItem(SWIFT_PATH_SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage/serialization errors; cache will remain in-memory only.
  }
}

export function resetSwiftPathCacheForTests(): void {
  swiftPathCache.clear();
  treeFetchPromise = null;
  swiftCacheInitializedFromSession = false;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SWIFT_PATH_SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in test helper.
  }
}

async function ensureSwiftTreeLoaded(): Promise<void> {
  // Hydrate from sessionStorage first — avoids the network on repeat visits.
  loadSwiftPathCacheFromSessionStorage();
  if (swiftPathCache.size > 0) return;

  if (!treeFetchPromise) {
    treeFetchPromise = (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TREE_FETCH_TIMEOUT_MS);
        try {
          const response = await fetch(
            'https://api.github.com/repos/element-hq/element-x-ios/git/trees/main?recursive=1',
            { signal: controller.signal }
          );
          if (!response.ok) return;
          const payload = (await response.json()) as GitHubTreeResponse;
          for (const item of payload.tree ?? []) {
            if (item.type === 'blob' && item.path?.endsWith('.swift')) {
              const name = item.path.split('/').pop();
              // Keep the first occurrence when multiple files share a name.
              if (name && !swiftPathCache.has(name)) {
                swiftPathCache.set(name, item.path);
              }
            }
          }
          // Persist the populated map for the rest of this browser session.
          saveSwiftPathCacheToSessionStorage();
        } finally {
          clearTimeout(timeoutId);
        }
      } catch {
        // Leave cache empty; caller will fall back to the search URL.
      } finally {
        // Allow a future retry if the cache is still empty (fetch failed/timed out).
        if (swiftPathCache.size === 0) {
          treeFetchPromise = null;
        }
      }
    })();
  }
  return treeFetchPromise;
}

/**
 * Resolve filename-only Swift references (e.g. "ClientProxy.swift") to a concrete
 * repository path, then return a direct blob URL pointing to the given line.
 * Returns undefined if resolution fails.
 */
export async function resolveSwiftFilenameToBlobUrl(
  fileName: string | undefined,
  lineNumber: number | undefined
): Promise<string | undefined> {
  if (!fileName || !lineNumber || !fileName.endsWith('.swift') || fileName.includes('/')) {
    return undefined;
  }

  await ensureSwiftTreeLoaded();

  const path = swiftPathCache.get(fileName);
  if (!path) return undefined;
  return `https://github.com/element-hq/element-x-ios/blob/main/${path}#L${lineNumber}`;
}
