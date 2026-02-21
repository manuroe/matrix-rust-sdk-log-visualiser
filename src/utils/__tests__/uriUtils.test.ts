import { describe, it, expect } from 'vitest';
import { extractRelativeUri, findCommonUriPrefix, stripCommonPrefix } from '../uriUtils';

describe('uriUtils', () => {
  describe('extractRelativeUri', () => {
    it('extracts path from full URL', () => {
      expect(extractRelativeUri('https://example.com/api/v1/users')).toBe('/api/v1/users');
    });

    it('extracts path with query string', () => {
      expect(extractRelativeUri('https://example.com/api/v1/users?id=123')).toBe('/api/v1/users?id=123');
    });

    it('extracts path with hash', () => {
      expect(extractRelativeUri('https://example.com/api/v1/users#section')).toBe('/api/v1/users#section');
    });

    it('extracts path with query and hash', () => {
      expect(extractRelativeUri('https://example.com/api/v1/users?id=123#section')).toBe('/api/v1/users?id=123#section');
    });

    it('handles root path', () => {
      expect(extractRelativeUri('https://example.com/')).toBe('/');
    });

    it('handles URL without path', () => {
      expect(extractRelativeUri('https://example.com')).toBe('/');
    });

    it('handles http protocol', () => {
      expect(extractRelativeUri('http://example.com/api/v1/users')).toBe('/api/v1/users');
    });

    it('returns relative path as-is when already relative', () => {
      expect(extractRelativeUri('/api/v1/users')).toBe('/api/v1/users');
    });

    it('returns invalid URL as-is', () => {
      expect(extractRelativeUri('not-a-url')).toBe('not-a-url');
    });

    it('handles URL-like string without proper protocol', () => {
      const result = extractRelativeUri('example.com/api/v1/users');
      expect(result).toBe('example.com/api/v1/users');
    });

    it('extracts path from URL with port', () => {
      expect(extractRelativeUri('https://example.com:8080/api/v1/users')).toBe('/api/v1/users');
    });

    it('handles URL with username and password', () => {
      expect(extractRelativeUri('https://user:pass@example.com/api/v1/users')).toBe('/api/v1/users');
    });
  });

  describe('findCommonUriPrefix', () => {
    it('finds common prefix for multiple URIs', () => {
      const uris = [
        'https://example.com/api/v1/users',
        'https://example.com/api/v1/posts',
        'https://example.com/api/v1/comments',
      ];
      expect(findCommonUriPrefix(uris)).toBe('/api/v1');
    });

    it('finds common prefix and stops at last slash', () => {
      const uris = [
        '/api/v1/users/123',
        '/api/v1/users/456',
        '/api/v1/users/789',
      ];
      expect(findCommonUriPrefix(uris)).toBe('/api/v1/users');
    });

    it('returns empty string for no common prefix', () => {
      const uris = [
        '/api/v1/users',
        '/web/v2/posts',
        '/mobile/v3/comments',
      ];
      expect(findCommonUriPrefix(uris)).toBe('');
    });

    it('returns empty string for empty array', () => {
      expect(findCommonUriPrefix([])).toBe('');
    });

    it('returns prefix for single URI', () => {
      expect(findCommonUriPrefix(['/api/v1/users'])).toBe('/api/v1');
    });

    it('handles URIs with different lengths', () => {
      const uris = [
        '/api/v1/users/123/profile',
        '/api/v1/users/456',
        '/api/v1/users',
      ];
      expect(findCommonUriPrefix(uris)).toBe('/api/v1');
    });

    it('returns empty string when prefix would break path segment', () => {
      const uris = [
        '/api/v1/users',
        '/api/v2/posts',
      ];
      expect(findCommonUriPrefix(uris)).toBe('/api');
    });

    it('handles full URLs and extracts common path prefix', () => {
      const uris = [
        'https://matrix.org/_matrix/client/v3/sync',
        'https://matrix.org/_matrix/client/v3/rooms/123/messages',
        'https://matrix.org/_matrix/client/v3/rooms/456/state',
      ];
      expect(findCommonUriPrefix(uris)).toBe('/_matrix/client/v3');
    });

    it('handles mixed full URLs and relative paths', () => {
      const uris = [
        'https://example.com/api/v1/users',
        '/api/v1/posts',
      ];
      expect(findCommonUriPrefix(uris)).toBe('/api/v1');
    });

    it('handles URIs with query strings', () => {
      const uris = [
        '/api/v1/users?limit=10',
        '/api/v1/posts?limit=20',
      ];
      expect(findCommonUriPrefix(uris)).toBe('/api/v1');
    });

    it('returns empty string for completely different URIs', () => {
      const uris = [
        'users',
        'posts',
        'comments',
      ];
      expect(findCommonUriPrefix(uris)).toBe('');
    });

    it('handles root-only URIs', () => {
      const uris = [
        '/',
        '/',
      ];
      expect(findCommonUriPrefix(uris)).toBe('');
    });

    it('handles single character differences', () => {
      const uris = [
        '/api/users',
        '/api/posts',
      ];
      expect(findCommonUriPrefix(uris)).toBe('/api');
    });
  });

  describe('stripCommonPrefix', () => {
    it('strips prefix from URI', () => {
      expect(stripCommonPrefix('/api/v1/users', '/api/v1')).toBe('/users');
    });

    it('returns root when prefix equals URI', () => {
      expect(stripCommonPrefix('/api/v1', '/api/v1')).toBe('/');
    });

    it('returns original URI when prefix does not match', () => {
      expect(stripCommonPrefix('/api/v1/users', '/web/v2')).toBe('/api/v1/users');
    });

    it('returns original URI when prefix is empty', () => {
      expect(stripCommonPrefix('/api/v1/users', '')).toBe('/api/v1/users');
    });

    it('handles URI without leading slash', () => {
      expect(stripCommonPrefix('api/v1/users', 'api/v1')).toBe('/users');
    });

    it('strips partial path segments correctly', () => {
      expect(stripCommonPrefix('/api/v1/users/123', '/api/v1')).toBe('/users/123');
    });

    it('handles query strings after stripping', () => {
      expect(stripCommonPrefix('/api/v1/users?id=123', '/api/v1')).toBe('/users?id=123');
    });

    it('returns root when stripping leaves empty path', () => {
      expect(stripCommonPrefix('/api', '/api')).toBe('/');
    });

    it('does not strip if URI does not start with prefix', () => {
      expect(stripCommonPrefix('/web/users', '/api')).toBe('/web/users');
    });

    it('handles prefix longer than URI', () => {
      expect(stripCommonPrefix('/api', '/api/v1/users')).toBe('/api');
    });
  });
});
