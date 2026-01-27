import { describe, it, expect } from 'vitest';
import {
  buildDisplayItems,
  calculateGapExpansion,
  getGapInfoForLine,
  type FilteredLine,
} from '../logGapManager';
import type { ParsedLogLine } from '../../types/log.types';

function makeMockLine(index: number): ParsedLogLine {
  return {
    lineNumber: index,
    rawText: `2024-01-01T00:00:00.000Z INFO Line ${index}`,
    timestamp: '2024-01-01T00:00:00.000Z',
    level: 'INFO',
    message: `Line ${index}`,
  };
}

function makeFilteredLines(indices: number[]): FilteredLine[] {
  return indices.map((idx) => ({ line: makeMockLine(idx), index: idx }));
}

function makeRawLines(count: number): ParsedLogLine[] {
  return Array.from({ length: count }, (_, i) => makeMockLine(i));
}

describe('logGapManager', () => {
  describe('buildDisplayItems', () => {
    it('returns empty array for no filtered lines', () => {
      const result = buildDisplayItems([], makeRawLines(10), new Map());
      expect(result).toEqual([]);
    });

    it('returns only filtered lines when no gaps expanded', () => {
      const filtered = makeFilteredLines([3, 7]);
      const raw = makeRawLines(10);
      const result = buildDisplayItems(filtered, raw, new Map());

      expect(result.length).toBe(2);
      expect(result[0].data.index).toBe(3);
      expect(result[1].data.index).toBe(7);
    });

    it('attaches gapAbove to first line when it has hidden lines above', () => {
      const filtered = makeFilteredLines([5]);
      const raw = makeRawLines(10);
      const result = buildDisplayItems(filtered, raw, new Map());

      expect(result.length).toBe(1);
      expect(result[0].gapAbove).toBeDefined();
      expect(result[0].gapAbove?.gapSize).toBe(5); // 0-4 are hidden
      expect(result[0].gapAbove?.remainingGap).toBe(5);
      expect(result[0].gapAbove?.isFirst).toBe(true);
    });

    it('attaches gapBelow to last line when it has hidden lines below', () => {
      const filtered = makeFilteredLines([3]);
      const raw = makeRawLines(10);
      const result = buildDisplayItems(filtered, raw, new Map());

      expect(result.length).toBe(1);
      expect(result[0].gapBelow).toBeDefined();
      expect(result[0].gapBelow?.gapSize).toBe(6); // 4-9 are hidden
      expect(result[0].gapBelow?.remainingGap).toBe(6);
      expect(result[0].gapBelow?.isLast).toBe(true);
    });

    it('inserts expanded lines after down expansion', () => {
      const filtered = makeFilteredLines([3, 8]);
      const raw = makeRawLines(10);
      const expandedGaps = new Map([['down-3', 2]]); // Expand 2 lines after 3

      const result = buildDisplayItems(filtered, raw, expandedGaps);

      // Should have: 3, 4, 5, 8
      expect(result.length).toBe(4);
      expect(result.map((r) => r.data.index)).toEqual([3, 4, 5, 8]);
    });

    it('inserts expanded lines after up expansion', () => {
      const filtered = makeFilteredLines([3, 8]);
      const raw = makeRawLines(10);
      const expandedGaps = new Map([['up-8', 2]]); // Expand 2 lines before 8

      const result = buildDisplayItems(filtered, raw, expandedGaps);

      // Should have: 3, 6, 7, 8
      expect(result.length).toBe(4);
      expect(result.map((r) => r.data.index)).toEqual([3, 6, 7, 8]);
    });

    it('handles cascading down expansions', () => {
      const filtered = makeFilteredLines([0, 20]);
      const raw = makeRawLines(25);
      const expandedGaps = new Map([
        ['down-0', 5], // Lines 1-5
        ['down-5', 3], // Lines 6-8 (from expanded line 5)
      ]);

      const result = buildDisplayItems(filtered, raw, expandedGaps);

      // Should have: 0, 1, 2, 3, 4, 5, 6, 7, 8, 20
      expect(result.map((r) => r.data.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 20]);
    });

    it('handles cascading up expansions', () => {
      const filtered = makeFilteredLines([5, 20]);
      const raw = makeRawLines(25);
      const expandedGaps = new Map([
        ['up-20', 5], // Lines 15-19
        ['up-15', 3], // Lines 12-14 (from expanded line 15)
      ]);

      const result = buildDisplayItems(filtered, raw, expandedGaps);

      // Should have: 5, 12, 13, 14, 15, 16, 17, 18, 19, 20
      expect(result.map((r) => r.data.index)).toEqual([5, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    });

    it('reduces remainingGap when lines are expanded', () => {
      const filtered = makeFilteredLines([0, 10]);
      const raw = makeRawLines(15);
      const expandedGaps = new Map([['down-0', 3]]); // Expanded 3 of 9 gap

      const result = buildDisplayItems(filtered, raw, expandedGaps);

      // Line 3 should have gapBelow with reduced remaining
      const line3 = result.find((r) => r.data.index === 3);
      expect(line3?.gapBelow).toBeDefined();
      expect(line3?.gapBelow?.gapSize).toBe(6); // 4-9 total gap from 3 to 10
      expect(line3?.gapBelow?.remainingGap).toBe(6); // None expanded yet from line 3
    });

    it('removes gap indicator when gap is fully expanded', () => {
      const filtered = makeFilteredLines([0, 3]);
      const raw = makeRawLines(10);
      const expandedGaps = new Map([['down-0', 2]]); // Fully expand gap (1, 2)

      const result = buildDisplayItems(filtered, raw, expandedGaps);

      // Line 0 should have no gapBelow, line 2 should have no gapBelow
      const line0 = result.find((r) => r.data.index === 0);
      const line2 = result.find((r) => r.data.index === 2);
      expect(line0?.gapBelow).toBeUndefined();
      expect(line2?.gapBelow).toBeUndefined();
    });
  });

  describe('calculateGapExpansion', () => {
    it('expands down gap by specified count', () => {
      const filtered = makeFilteredLines([5, 15]);
      const expandedGaps = new Map<string, number>();

      const result = calculateGapExpansion('down-5', 3, filtered, 20, expandedGaps);

      expect(result.get('down-5')).toBe(3);
    });

    it('expands up gap by specified count', () => {
      const filtered = makeFilteredLines([5, 15]);
      const expandedGaps = new Map<string, number>();

      const result = calculateGapExpansion('up-15', 4, filtered, 20, expandedGaps);

      expect(result.get('up-15')).toBe(4);
    });

    it('expands all remaining lines when count is "all"', () => {
      const filtered = makeFilteredLines([5, 15]);
      const expandedGaps = new Map<string, number>();

      const result = calculateGapExpansion('down-5', 'all', filtered, 20, expandedGaps);

      expect(result.get('down-5')).toBe(9); // Lines 6-14 = 9 lines
    });

    it('accumulates expansion on subsequent calls', () => {
      const filtered = makeFilteredLines([0, 20]);
      let expandedGaps = new Map<string, number>();

      expandedGaps = calculateGapExpansion('down-0', 5, filtered, 25, expandedGaps);
      expect(expandedGaps.get('down-0')).toBe(5);

      expandedGaps = calculateGapExpansion('down-0', 3, filtered, 25, expandedGaps);
      expect(expandedGaps.get('down-0')).toBe(8);
    });

    it('caps expansion at remaining gap size', () => {
      const filtered = makeFilteredLines([5, 10]);
      const expandedGaps = new Map<string, number>();

      const result = calculateGapExpansion('down-5', 100, filtered, 20, expandedGaps);

      expect(result.get('down-5')).toBe(4); // Only 4 lines between 5 and 10
    });

    it('returns unchanged map when gap is fully expanded', () => {
      const filtered = makeFilteredLines([5, 10]);
      const expandedGaps = new Map([['down-5', 4]]);

      const result = calculateGapExpansion('down-5', 10, filtered, 20, expandedGaps);

      expect(result).toBe(expandedGaps); // Same reference, unchanged
    });

    it('returns unchanged map for invalid gap ID', () => {
      const filtered = makeFilteredLines([5, 10]);
      const expandedGaps = new Map<string, number>();

      const result = calculateGapExpansion('invalid-5', 10, filtered, 20, expandedGaps);

      expect(result).toBe(expandedGaps);
    });
  });

  describe('getGapInfoForLine', () => {
    it('returns gap above when there are hidden lines above', () => {
      const displayedIndices = [10, 20];
      const expandedGaps = new Map<string, number>();

      const result = getGapInfoForLine(10, displayedIndices, 25, expandedGaps);

      expect(result.up).toBeDefined();
      expect(result.up?.gapSize).toBe(10);
      expect(result.up?.remainingGap).toBe(10);
      expect(result.up?.isFirst).toBe(true);
    });

    it('returns gap below when there are hidden lines below', () => {
      const displayedIndices = [10, 20];
      const expandedGaps = new Map<string, number>();

      const result = getGapInfoForLine(10, displayedIndices, 25, expandedGaps);

      expect(result.down).toBeDefined();
      expect(result.down?.gapSize).toBe(9);
      expect(result.down?.remainingGap).toBe(9);
    });

    it('returns both gaps when line has hidden above and below', () => {
      const displayedIndices = [5, 10, 20];
      const expandedGaps = new Map<string, number>();

      const result = getGapInfoForLine(10, displayedIndices, 25, expandedGaps);

      expect(result.up).toBeDefined();
      expect(result.down).toBeDefined();
    });

    it('returns no gaps when line is not in display', () => {
      const displayedIndices = [5, 10, 20];
      const expandedGaps = new Map<string, number>();

      const result = getGapInfoForLine(99, displayedIndices, 25, expandedGaps);

      expect(result.up).toBeUndefined();
      expect(result.down).toBeUndefined();
    });

    it('returns no gap above for adjacent lines', () => {
      const displayedIndices = [5, 6, 10];
      const expandedGaps = new Map<string, number>();

      const result = getGapInfoForLine(6, displayedIndices, 25, expandedGaps);

      expect(result.up).toBeUndefined(); // No gap between 5 and 6
      expect(result.down).toBeDefined(); // Gap between 6 and 10
    });

    it('accounts for expanded gaps in remaining count', () => {
      const displayedIndices = [5, 15];
      const expandedGaps = new Map([['down-5', 3]]);

      const result = getGapInfoForLine(5, displayedIndices, 20, expandedGaps);

      expect(result.down).toBeDefined();
      expect(result.down?.gapSize).toBe(9);
      expect(result.down?.remainingGap).toBe(6); // 9 - 3 already expanded
    });
  });
});
