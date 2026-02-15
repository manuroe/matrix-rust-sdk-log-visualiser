/**
 * Test helpers for URL parameter assertion and manipulation.
 * Provides utilities for setting, getting, and asserting URL parameters in hash-based routing.
 */

/**
 * Set multiple URL parameters in window.location.hash at once.
 * Example: setHashParams({ filter: 'sync', status: '200' })
 * Results in hash: '#/current-route?filter=sync&status=200'
 */
export function setHashParams(params: Record<string, string | null>): void {
  const hash = window.location.hash;
  const routeMatch = hash.match(/^#([^?]*)/);
  const route = routeMatch ? routeMatch[1] : '/';

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
  });

  const queryString = searchParams.toString();
  window.location.hash = queryString ? `${route}?${queryString}` : route;
}

/**
 * Get a specific URL parameter value from window.location.hash.
 * Returns null if parameter not found.
 * Example: getHashParam('filter') // => 'sync' or null
 */
export function getHashParam(name: string): string | null {
  const hash = window.location.hash;
  const match = hash.match(new RegExp(`[?&]${name}=([^&]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Get all URL parameters as an object.
 * Example: getAllHashParams() // => { filter: 'sync', status: '200' }
 */
export function getAllHashParams(): Record<string, string> {
  const hash = window.location.hash;
  const paramsMatch = hash.match(/\?(.+)/);
  if (!paramsMatch) return {};

  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(paramsMatch[1]);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Assert that a URL parameter has the expected value.
 * Throws AssertionError if parameter doesn't match.
 * Example: expectHashParam('filter', 'sync')
 *          expectHashParam('missing_param', null)
 */
export function expectHashParam(name: string, expectedValue: string | null): void {
  const actualValue = getHashParam(name);
  if (actualValue !== expectedValue) {
    throw new Error(
      `Expected URL param '${name}' to be '${expectedValue}' but got '${actualValue}'`
    );
  }
}

/**
 * Assert that all URL parameters match expected values.
 * Only checks parameters included in expectedParams; others are ignored.
 * Example: expectHashParams({ filter: 'sync', status: '200' })
 */
export function expectHashParams(expectedParams: Record<string, string | null>): void {
  const actualParams = getAllHashParams();
  Object.entries(expectedParams).forEach(([key, expectedValue]) => {
    const actualValue = actualParams[key] ?? null;
    if (actualValue !== expectedValue) {
      throw new Error(
        `Expected URL param '${key}' to be '${expectedValue}' but got '${actualValue}'`
      );
    }
  });
}

/**
 * Get the current route path from window.location.hash (without query params).
 * Example: getHashRoute() // => '/http_requests' (from '#/http_requests?filter=sync')
 */
export function getHashRoute(): string {
  const hash = window.location.hash;
  const routeMatch = hash.match(/^#([^?]*)/);
  return routeMatch ? routeMatch[1] : '/';
}
