import { describe, it, expect } from 'vitest';
import {
  findMatchingIndices,
  expandWithContext,
  highlightText,
  textContains,
} from '../textMatching';

describe('textMatching utilities', () => {
  describe('findMatchingIndices', () => {
    const items = [
      { text: 'Hello World' },
      { text: 'hello there' },
      { text: 'HELLO AGAIN' },
      { text: 'goodbye' },
      { text: 'Say Hello!' },
    ];
    const getText = (item: { text: string }) => item.text;

    it('returns empty set for empty query', () => {
      const result = findMatchingIndices(items, '', false, getText);
      expect(result.size).toBe(0);
    });

    it('returns empty set for whitespace-only query', () => {
      const result = findMatchingIndices(items, '   ', false, getText);
      expect(result.size).toBe(0);
    });

    it('finds matches case-insensitively by default', () => {
      const result = findMatchingIndices(items, 'hello', false, getText);
      expect(Array.from(result).sort()).toEqual([0, 1, 2, 4]);
    });

    it('finds matches case-sensitively when enabled', () => {
      const result = findMatchingIndices(items, 'hello', true, getText);
      expect(Array.from(result)).toEqual([1]);
    });

    it('finds matches with exact case when case-sensitive', () => {
      const result = findMatchingIndices(items, 'HELLO', true, getText);
      expect(Array.from(result)).toEqual([2]);
    });

    it('returns empty set when no matches found', () => {
      const result = findMatchingIndices(items, 'xyz', false, getText);
      expect(result.size).toBe(0);
    });

    it('handles empty items array', () => {
      const result = findMatchingIndices([], 'test', false, getText);
      expect(result.size).toBe(0);
    });

    it('finds partial matches', () => {
      const result = findMatchingIndices(items, 'ell', false, getText);
      expect(Array.from(result).sort()).toEqual([0, 1, 2, 4]);
    });
  });

  describe('expandWithContext', () => {
    it('returns original set when contextLines is 0', () => {
      const matches = new Set([5, 10, 15]);
      const result = expandWithContext(matches, 100, 0);
      expect(result).toBe(matches);
    });

    it('expands matches with context lines', () => {
      const matches = new Set([5]);
      const result = expandWithContext(matches, 100, 2);
      expect(Array.from(result).sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 7]);
    });

    it('respects lower bound (0)', () => {
      const matches = new Set([1]);
      const result = expandWithContext(matches, 100, 3);
      expect(Array.from(result).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
    });

    it('respects upper bound (totalCount - 1)', () => {
      const matches = new Set([98]);
      const result = expandWithContext(matches, 100, 3);
      expect(Array.from(result).sort((a, b) => a - b)).toEqual([95, 96, 97, 98, 99]);
    });

    it('merges overlapping context ranges', () => {
      const matches = new Set([5, 7]);
      const result = expandWithContext(matches, 100, 2);
      // 5 expands to 3,4,5,6,7 and 7 expands to 5,6,7,8,9
      // merged: 3,4,5,6,7,8,9
      expect(Array.from(result).sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    });

    it('handles empty matches set', () => {
      const matches = new Set<number>();
      const result = expandWithContext(matches, 100, 5);
      expect(result.size).toBe(0);
    });

    it('handles single item at start', () => {
      const matches = new Set([0]);
      const result = expandWithContext(matches, 10, 2);
      expect(Array.from(result).sort((a, b) => a - b)).toEqual([0, 1, 2]);
    });

    it('handles single item at end', () => {
      const matches = new Set([9]);
      const result = expandWithContext(matches, 10, 2);
      expect(Array.from(result).sort((a, b) => a - b)).toEqual([7, 8, 9]);
    });
  });

  describe('highlightText', () => {
    it('returns original text when query is empty', () => {
      const result = highlightText('Hello World', {
        query: '',
        caseSensitive: false,
        keyPrefix: 'test',
      });
      expect(result).toEqual(['Hello World']);
    });

    it('returns original text when query is whitespace', () => {
      const result = highlightText('Hello World', {
        query: '   ',
        caseSensitive: false,
        keyPrefix: 'test',
      });
      expect(result).toEqual(['Hello World']);
    });

    it('highlights case-insensitive matches', () => {
      const result = highlightText('Hello World', {
        query: 'world',
        caseSensitive: false,
        keyPrefix: 'test',
      });
      expect(result.length).toBe(2);
      // First part is text before match
      expect(result[0]).toHaveProperty('props.children', 'Hello ');
      // Second part is the highlighted match
      expect(result[1]).toHaveProperty('type', 'mark');
      expect(result[1]).toHaveProperty('props.children', 'World');
    });

    it('highlights case-sensitive matches only', () => {
      const result = highlightText('Hello hello HELLO', {
        query: 'hello',
        caseSensitive: true,
        keyPrefix: 'test',
      });
      // Should only match the middle 'hello'
      expect(result.length).toBe(3);
      expect(result[0]).toHaveProperty('props.children', 'Hello ');
      expect(result[1]).toHaveProperty('type', 'mark');
      expect(result[1]).toHaveProperty('props.children', 'hello');
      expect(result[2]).toHaveProperty('props.children', ' HELLO');
    });

    it('highlights multiple occurrences', () => {
      const result = highlightText('foo bar foo baz foo', {
        query: 'foo',
        caseSensitive: false,
        keyPrefix: 'test',
      });
      // 3 marks + 2 text spans between
      const marks = result.filter((r) => typeof r === 'object' && r !== null && 'type' in r && r.type === 'mark');
      expect(marks.length).toBe(3);
    });

    it('applies custom highlight class name', () => {
      const result = highlightText('test match', {
        query: 'match',
        caseSensitive: false,
        keyPrefix: 'test',
        highlightClassName: 'custom-highlight',
      });
      const mark = result.find(
        (r) => typeof r === 'object' && r !== null && 'type' in r && r.type === 'mark'
      );
      expect(mark).toHaveProperty('props.className', 'custom-highlight');
    });

    it('handles match at start of text', () => {
      const result = highlightText('Hello World', {
        query: 'Hello',
        caseSensitive: false,
        keyPrefix: 'test',
      });
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('type', 'mark');
      expect(result[0]).toHaveProperty('props.children', 'Hello');
    });

    it('handles match at end of text', () => {
      const result = highlightText('Hello World', {
        query: 'World',
        caseSensitive: false,
        keyPrefix: 'test',
      });
      expect(result.length).toBe(2);
      expect(result[1]).toHaveProperty('type', 'mark');
    });

    it('handles entire text as match', () => {
      const result = highlightText('test', {
        query: 'test',
        caseSensitive: false,
        keyPrefix: 'test',
      });
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('type', 'mark');
      expect(result[0]).toHaveProperty('props.children', 'test');
    });

    it('returns original text when no match found', () => {
      const result = highlightText('Hello World', {
        query: 'xyz',
        caseSensitive: false,
        keyPrefix: 'test',
      });
      expect(result).toEqual(['Hello World']);
    });
  });

  describe('textContains', () => {
    it('returns false for empty query', () => {
      expect(textContains('Hello World', '', false)).toBe(false);
    });

    it('returns false for whitespace-only query', () => {
      expect(textContains('Hello World', '   ', false)).toBe(false);
    });

    it('finds case-insensitive matches', () => {
      expect(textContains('Hello World', 'world', false)).toBe(true);
      expect(textContains('Hello World', 'HELLO', false)).toBe(true);
    });

    it('respects case sensitivity', () => {
      expect(textContains('Hello World', 'world', true)).toBe(false);
      expect(textContains('Hello World', 'World', true)).toBe(true);
    });

    it('returns false when text does not contain query', () => {
      expect(textContains('Hello World', 'xyz', false)).toBe(false);
    });
  });
});
