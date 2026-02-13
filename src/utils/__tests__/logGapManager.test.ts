import { describe, it, expect } from 'vitest';
import {
  buildDisplayItems,
  calculateGapExpansion,
  getGapInfoForLine,
  type FilteredLine,
  type ForcedRange,
} from '../logGapManager';
import { createParsedLogLine, createParsedLogLines } from '../../test/fixtures';
import type { ParsedLogLine } from '../../types/log.types';

function makeFilteredLines(indices: number[]): FilteredLine[] {
  return indices.map((idx) => ({ line: createParsedLogLine({ lineNumber: idx }), index: idx }));
}

function makeRawLines(count: number): ParsedLogLine[] {
  return createParsedLogLines(count);
}

describe('logGapManager', () => {
  describe('buildDisplayItems', () => {
    it('returns empty array for no filtered lines', () => {
      const result = buildDisplayItems([], makeRawLines(10), []);
      expect(result).toEqual([]);
    });

    it('returns only filtered lines when no forced ranges exist', () => {
      const filtered = makeFilteredLines([3, 7]);
      const raw = makeRawLines(10);
      const result = buildDisplayItems(filtered, raw, []);

      expect(result.length).toBe(2);
      expect(result[0].data.index).toBe(3);
      expect(result[1].data.index).toBe(7);
    });

    it('attaches gapAbove to first line when it has hidden lines above', () => {
      const filtered = makeFilteredLines([5]);
      const raw = makeRawLines(10);
      const result = buildDisplayItems(filtered, raw, []);

      expect(result.length).toBe(1);
      expect(result[0].gapAbove).toBeDefined();
      expect(result[0].gapAbove?.gapSize).toBe(5); // 0-4 are hidden
      expect(result[0].gapAbove?.remainingGap).toBe(5);
      expect(result[0].gapAbove?.isFirst).toBe(true);
    });

    it('attaches gapBelow to last line when it has hidden lines below', () => {
      const filtered = makeFilteredLines([3]);
      const raw = makeRawLines(10);
      const result = buildDisplayItems(filtered, raw, []);

      expect(result.length).toBe(1);
      expect(result[0].gapBelow).toBeDefined();
      expect(result[0].gapBelow?.gapSize).toBe(6); // 4-9 are hidden
      expect(result[0].gapBelow?.remainingGap).toBe(6);
      expect(result[0].gapBelow?.isLast).toBe(true);
    });

    it('inserts forced lines after down expansion', () => {
      const filtered = makeFilteredLines([3, 8]);
      const raw = makeRawLines(10);
      const forcedRanges: ForcedRange[] = [{ start: 4, end: 6 }];

      const result = buildDisplayItems(filtered, raw, forcedRanges);

      // Should have: 3, 4, 5, 8
      expect(result.length).toBe(4);
      expect(result.map((r) => r.data.index)).toEqual([3, 4, 5, 8]);
    });

    it('inserts forced lines before up expansion', () => {
      const filtered = makeFilteredLines([3, 8]);
      const raw = makeRawLines(10);
      const forcedRanges: ForcedRange[] = [{ start: 6, end: 8 }];

      const result = buildDisplayItems(filtered, raw, forcedRanges);

      // Should have: 3, 6, 7, 8
      expect(result.length).toBe(4);
      expect(result.map((r) => r.data.index)).toEqual([3, 6, 7, 8]);
    });

    it('merges overlapping forced ranges', () => {
      const filtered = makeFilteredLines([3, 8]);
      const raw = makeRawLines(10);
      const forcedRanges: ForcedRange[] = [
        { start: 4, end: 6 },
        { start: 5, end: 8 },
      ];

      const result = buildDisplayItems(filtered, raw, forcedRanges);

      expect(result.map((r) => r.data.index)).toEqual([3, 4, 5, 6, 7, 8]);
    });

    it('reduces remaining gap based on displayed neighbors', () => {
      const filtered = makeFilteredLines([0, 10]);
      const raw = makeRawLines(15);
      const forcedRanges: ForcedRange[] = [{ start: 1, end: 4 }];

      const result = buildDisplayItems(filtered, raw, forcedRanges);

      const line3 = result.find((r) => r.data.index === 3);
      expect(line3?.gapBelow).toBeDefined();
      expect(line3?.gapBelow?.gapSize).toBe(6); // 4-9 total gap from 3 to 10
      expect(line3?.gapBelow?.remainingGap).toBe(6);
    });

    it('removes gap indicator when gap is fully expanded', () => {
      const filtered = makeFilteredLines([0, 3]);
      const raw = makeRawLines(10);
      const forcedRanges: ForcedRange[] = [{ start: 1, end: 3 }];

      const result = buildDisplayItems(filtered, raw, forcedRanges);

      const line0 = result.find((r) => r.data.index === 0);
      const line2 = result.find((r) => r.data.index === 2);
      expect(line0?.gapBelow).toBeUndefined();
      expect(line2?.gapBelow).toBeUndefined();
    });
  });

  describe('calculateGapExpansion', () => {
    it('expands down gap by specified count', () => {
      const displayedIndices = [5, 15];
      const forcedRanges: ForcedRange[] = [];

      const result = calculateGapExpansion('down-5', 3, displayedIndices, 20, forcedRanges);

      expect(result).toEqual([{ start: 6, end: 9 }]);
    });

    it('expands up gap by specified count', () => {
      const displayedIndices = [5, 15];
      const forcedRanges: ForcedRange[] = [];

      const result = calculateGapExpansion('up-15', 4, displayedIndices, 20, forcedRanges);

      expect(result).toEqual([{ start: 11, end: 15 }]);
    });

    it('expands all remaining lines when count is "all"', () => {
      const displayedIndices = [5, 15];
      const forcedRanges: ForcedRange[] = [];

      const result = calculateGapExpansion('down-5', 'all', displayedIndices, 20, forcedRanges);

      expect(result).toEqual([{ start: 6, end: 15 }]); // Lines 6-14
    });

    it('accumulates expansion on subsequent calls', () => {
      const displayedIndices = [0, 20];
      let forcedRanges: ForcedRange[] = [];

      forcedRanges = calculateGapExpansion('down-0', 5, displayedIndices, 25, forcedRanges);
      expect(forcedRanges).toEqual([{ start: 1, end: 6 }]);

      const updatedDisplayed = [0, 1, 2, 3, 4, 5, 20];
      forcedRanges = calculateGapExpansion('down-5', 3, updatedDisplayed, 25, forcedRanges);
      expect(forcedRanges).toEqual([{ start: 1, end: 9 }]);
    });

    it('caps expansion at remaining gap size', () => {
      const displayedIndices = [5, 10];
      const forcedRanges: ForcedRange[] = [];

      const result = calculateGapExpansion('down-5', 100, displayedIndices, 20, forcedRanges);

      expect(result).toEqual([{ start: 6, end: 10 }]);
    });

    it('returns unchanged ranges when gap is fully expanded', () => {
      const displayedIndices = [5, 10];
      const forcedRanges: ForcedRange[] = [{ start: 6, end: 10 }];

      const result = calculateGapExpansion('down-5', 10, displayedIndices, 20, forcedRanges);

      expect(result).toBe(forcedRanges);
    });

    it('returns unchanged ranges for invalid gap ID', () => {
      const displayedIndices = [5, 10];
      const forcedRanges: ForcedRange[] = [];

      const result = calculateGapExpansion('invalid-5', 10, displayedIndices, 20, forcedRanges);

      expect(result).toBe(forcedRanges);
    });

    it('uses request boundary for next-match when provided', () => {
      const displayedIndices = [5, 15];
      const forcedRanges: ForcedRange[] = [];

      const result = calculateGapExpansion(
        'down-5',
        'next-match',
        displayedIndices,
        20,
        forcedRanges,
        undefined,
        undefined,
        { start: 12, end: 14 }
      );

      expect(result).toEqual([{ start: 6, end: 13 }]);
    });

    it('uses request boundary for prev-match when provided', () => {
      const displayedIndices = [5, 15];
      const forcedRanges: ForcedRange[] = [];

      const result = calculateGapExpansion(
        'up-15',
        'prev-match',
        displayedIndices,
        20,
        forcedRanges,
        undefined,
        { start: 7, end: 12 },
        undefined
      );

      expect(result).toEqual([{ start: 12, end: 15 }]);
    });
  });

  describe('getGapInfoForLine', () => {
    it('returns gap above when there are hidden lines above', () => {
      const displayedIndices = [10, 20];

      const result = getGapInfoForLine(10, displayedIndices, 25);

      expect(result.up).toBeDefined();
      expect(result.up?.gapSize).toBe(10);
      expect(result.up?.remainingGap).toBe(10);
      expect(result.up?.isFirst).toBe(true);
    });

    it('returns gap below when there are hidden lines below', () => {
      const displayedIndices = [10, 20];

      const result = getGapInfoForLine(10, displayedIndices, 25);

      expect(result.down).toBeDefined();
      expect(result.down?.gapSize).toBe(9);
      expect(result.down?.remainingGap).toBe(9);
    });

    it('returns both gaps when line has hidden above and below', () => {
      const displayedIndices = [5, 10, 20];

      const result = getGapInfoForLine(10, displayedIndices, 25);

      expect(result.up).toBeDefined();
      expect(result.down).toBeDefined();
    });

    it('returns no gaps when line is not in display', () => {
      const displayedIndices = [5, 10, 20];

      const result = getGapInfoForLine(99, displayedIndices, 25);

      expect(result.up).toBeUndefined();
      expect(result.down).toBeUndefined();
    });

    it('returns no gap above for adjacent lines', () => {
      const displayedIndices = [5, 6, 10];

      const result = getGapInfoForLine(6, displayedIndices, 25);

      expect(result.up).toBeUndefined();
      expect(result.down).toBeDefined();
    });

    it('reflects smaller gaps when forced lines are displayed', () => {
      const displayedIndices = [5, 8, 15];

      const result = getGapInfoForLine(5, displayedIndices, 20);

      expect(result.down).toBeDefined();
      expect(result.down?.gapSize).toBe(2); // Lines 6-7 are hidden between 5 and 8
      expect(result.down?.remainingGap).toBe(2);
    });
  });
});
