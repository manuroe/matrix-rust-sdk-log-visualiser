import { describe, it, expect } from 'vitest';
import {
  detectCollapseGroups,
  stripTimestamp,
  COLLAPSE_IGNORE_SOURCES,
  MIN_COLLAPSE_COUNT,
  type CollapseGroupInfo,
} from '../logCollapsingUtils';
import { createParsedLogLine } from '../../test/fixtures';
import type { FilteredLine } from '../logGapManager';
import type { ParsedLogLine } from '../../types/log.types';

function makeFilteredLine(index: number, overrides: Partial<ParsedLogLine> = {}): FilteredLine {
  return {
    line: createParsedLogLine({ lineNumber: index, ...overrides }),
    index,
  };
}

function makeFilteredLineWithSource(
  index: number,
  filePath: string,
  sourceLineNumber: number,
  rawTextSuffix?: string
): FilteredLine {
  const rawText = `2024-01-15T10:00:${String(index).padStart(2, '0')}.000000Z INFO ${rawTextSuffix ?? `message from ${filePath}:${sourceLineNumber}`} | ${filePath}:${sourceLineNumber} | spans: root`;
  return {
    line: createParsedLogLine({
      lineNumber: index,
      filePath,
      sourceLineNumber,
      rawText,
    }),
    index,
  };
}

describe('stripTimestamp', () => {
  it('strips ISO timestamp with microseconds and Z', () => {
    expect(stripTimestamp('2026-03-06T17:05:59.920483Z ERROR something'))
      .toBe('ERROR something');
  });

  it('strips ISO timestamp without Z', () => {
    expect(stripTimestamp('2024-01-15T10:00:00.000000 INFO message'))
      .toBe('INFO message');
  });

  it('returns original text if no timestamp found', () => {
    expect(stripTimestamp('no timestamp here'))
      .toBe('no timestamp here');
  });
});

describe('detectCollapseGroups', () => {
  it('returns empty result for fewer than 2 lines', () => {
    const result = detectCollapseGroups([]);
    expect(result.collapsedIndices.size).toBe(0);
    expect(result.collapseGroups.size).toBe(0);

    const single = detectCollapseGroups([makeFilteredLine(0)]);
    expect(single.collapsedIndices.size).toBe(0);
    expect(single.collapseGroups.size).toBe(0);
  });

  it('detects exact duplicates (same text after removing timestamp)', () => {
    const lines: FilteredLine[] = [
      {
        line: createParsedLogLine({
          lineNumber: 0,
          rawText: '2024-01-15T10:00:00.000000Z INFO Duplicate message',
        }),
        index: 0,
      },
      {
        line: createParsedLogLine({
          lineNumber: 1,
          rawText: '2024-01-15T10:00:01.000000Z INFO Duplicate message',
        }),
        index: 1,
      },
      {
        line: createParsedLogLine({
          lineNumber: 2,
          rawText: '2024-01-15T10:00:02.000000Z INFO Duplicate message',
        }),
        index: 2,
      },
      {
        line: createParsedLogLine({
          lineNumber: 3,
          rawText: '2024-01-15T10:00:03.000000Z INFO Duplicate message',
        }),
        index: 3,
      },
    ];

    const result = detectCollapseGroups(lines);

    expect(result.collapsedIndices).toEqual(new Set([1, 2, 3]));
    // 1 primary + 2 continuation entries (down-1, down-2)
    expect(result.collapseGroups.size).toBe(3);
    expect(result.collapseGroups.get('down-0')).toEqual({ type: 'exact', count: 3 });
    expect(result.collapseGroups.get('down-1')).toEqual({ type: 'exact', count: 2 });
    expect(result.collapseGroups.get('down-2')).toEqual({ type: 'exact', count: 1 });
  });

  it(`does not collapse groups smaller than MIN_COLLAPSE_COUNT (${MIN_COLLAPSE_COUNT})`, () => {
    // 3 exact duplicates = total group size 3, below threshold of 4
    const lines: FilteredLine[] = [
      {
        line: createParsedLogLine({
          lineNumber: 0,
          rawText: '2024-01-15T10:00:00.000000Z INFO Small dup group',
        }),
        index: 0,
      },
      {
        line: createParsedLogLine({
          lineNumber: 1,
          rawText: '2024-01-15T10:00:01.000000Z INFO Small dup group',
        }),
        index: 1,
      },
      {
        line: createParsedLogLine({
          lineNumber: 2,
          rawText: '2024-01-15T10:00:02.000000Z INFO Small dup group',
        }),
        index: 2,
      },
    ];

    const result = detectCollapseGroups(lines);

    expect(result.collapsedIndices.size).toBe(0);
    expect(result.collapseGroups.size).toBe(0);
  });

  it('detects similar lines (same filePath and sourceLineNumber)', () => {
    const lines: FilteredLine[] = [
      makeFilteredLineWithSource(0, 'crates/matrix-sdk/src/room.rs', 42, 'Room is unknown room_id=!abc'),
      makeFilteredLineWithSource(1, 'crates/matrix-sdk/src/room.rs', 42, 'Room is unknown room_id=!def'),
      makeFilteredLineWithSource(2, 'crates/matrix-sdk/src/room.rs', 42, 'Room is unknown room_id=!ghi'),
      makeFilteredLineWithSource(3, 'crates/matrix-sdk/src/room.rs', 42, 'Room is unknown room_id=!jkl'),
    ];

    const result = detectCollapseGroups(lines);

    expect(result.collapsedIndices).toEqual(new Set([1, 2, 3]));
    expect(result.collapseGroups.get('down-0')).toEqual({ type: 'similar', count: 3 });
  });

  it('demotes exact group to similar when a member is only similar', () => {
    const lines: FilteredLine[] = [
      makeFilteredLineWithSource(0, 'crates/room.rs', 10, 'exact text'),
      makeFilteredLineWithSource(1, 'crates/room.rs', 10, 'exact text'),
      makeFilteredLineWithSource(2, 'crates/room.rs', 10, 'different text'),
      makeFilteredLineWithSource(3, 'crates/room.rs', 10, 'different text 2'),
    ];

    const result = detectCollapseGroups(lines);

    expect(result.collapsedIndices).toEqual(new Set([1, 2, 3]));
    expect(result.collapseGroups.get('down-0')).toEqual({ type: 'similar', count: 3 });
  });

  it('does not collapse non-adjacent raw indices', () => {
    const lines: FilteredLine[] = [
      {
        line: createParsedLogLine({
          lineNumber: 0,
          rawText: '2024-01-15T10:00:00.000000Z INFO Same message',
        }),
        index: 0,
      },
      // Gap in indices: index 2 follows index 0 (index 1 is filtered out)
      {
        line: createParsedLogLine({
          lineNumber: 2,
          rawText: '2024-01-15T10:00:02.000000Z INFO Same message',
        }),
        index: 2,
      },
    ];

    const result = detectCollapseGroups(lines);

    expect(result.collapsedIndices.size).toBe(0);
    expect(result.collapseGroups.size).toBe(0);
  });

  it('does not collapse unrelated lines', () => {
    const lines: FilteredLine[] = [
      {
        line: createParsedLogLine({
          lineNumber: 0,
          rawText: '2024-01-15T10:00:00.000000Z INFO First message',
        }),
        index: 0,
      },
      {
        line: createParsedLogLine({
          lineNumber: 1,
          rawText: '2024-01-15T10:00:01.000000Z ERROR Different message',
        }),
        index: 1,
      },
    ];

    const result = detectCollapseGroups(lines);

    expect(result.collapsedIndices.size).toBe(0);
    expect(result.collapseGroups.size).toBe(0);
  });

  it('creates separate groups for non-consecutive similar lines', () => {
    const lines: FilteredLine[] = [
      makeFilteredLineWithSource(0, 'crates/room.rs', 42, 'msg A'),
      makeFilteredLineWithSource(1, 'crates/room.rs', 42, 'msg B'),
      makeFilteredLineWithSource(2, 'crates/room.rs', 42, 'msg C'),
      makeFilteredLineWithSource(3, 'crates/room.rs', 42, 'msg D'),
      {
        line: createParsedLogLine({
          lineNumber: 4,
          rawText: '2024-01-15T10:00:04.000000Z INFO unrelated line',
        }),
        index: 4,
      },
      makeFilteredLineWithSource(5, 'crates/room.rs', 42, 'msg E'),
      makeFilteredLineWithSource(6, 'crates/room.rs', 42, 'msg F'),
      makeFilteredLineWithSource(7, 'crates/room.rs', 42, 'msg G'),
      makeFilteredLineWithSource(8, 'crates/room.rs', 42, 'msg H'),
    ];

    const result = detectCollapseGroups(lines);

    expect(result.collapsedIndices).toEqual(new Set([1, 2, 3, 6, 7, 8]));
    // 2 primary + 2 continuation per group = 6 total
    expect(result.collapseGroups.size).toBe(6);
    expect(result.collapseGroups.get('down-0')).toEqual({ type: 'similar', count: 3 });
    expect(result.collapseGroups.get('down-5')).toEqual({ type: 'similar', count: 3 });
  });

  it('ignores lines from COLLAPSE_IGNORE_SOURCES as group representatives', () => {
    const ignoredPath = COLLAPSE_IGNORE_SOURCES[0];
    const lines: FilteredLine[] = [
      makeFilteredLineWithSource(0, ignoredPath, 89, 'request A'),
      makeFilteredLineWithSource(1, ignoredPath, 89, 'request B'),
      makeFilteredLineWithSource(2, ignoredPath, 89, 'request C'),
    ];

    const result = detectCollapseGroups(lines);

    expect(result.collapsedIndices.size).toBe(0);
    expect(result.collapseGroups.size).toBe(0);
  });

  it('ignored source breaks an ongoing group', () => {
    const ignoredPath = COLLAPSE_IGNORE_SOURCES[0];
    const lines: FilteredLine[] = [
      makeFilteredLineWithSource(0, 'crates/room.rs', 42, 'msg A'),
      makeFilteredLineWithSource(1, ignoredPath, 89, 'ignored line'),
      makeFilteredLineWithSource(2, 'crates/room.rs', 42, 'msg B'),
    ];

    const result = detectCollapseGroups(lines);

    // Lines 0 and 2 are not adjacent (1 is between them), so no grouping
    expect(result.collapsedIndices.size).toBe(0);
  });

  it('handles mixed exact and similar in a single group', () => {
    const lines: FilteredLine[] = [
      makeFilteredLineWithSource(0, 'crates/room.rs', 10, 'exact text'),
      // index 1: exact match to representative
      makeFilteredLineWithSource(1, 'crates/room.rs', 10, 'exact text'),
      // index 2: similar (same source) but different text
      makeFilteredLineWithSource(2, 'crates/room.rs', 10, 'slightly different'),
      // index 3: also similar
      makeFilteredLineWithSource(3, 'crates/room.rs', 10, 'another variation'),
    ];

    const result = detectCollapseGroups(lines);

    expect(result.collapsedIndices).toEqual(new Set([1, 2, 3]));
    // Demoted to 'similar' because line 2 is only similar, not exact
    expect(result.collapseGroups.get('down-0')).toEqual({ type: 'similar', count: 3 });
  });

  it('returns correct gap IDs matching the gap manager format', () => {
    const lines: FilteredLine[] = [
      {
        line: createParsedLogLine({
          lineNumber: 10,
          rawText: '2024-01-15T10:00:00.000000Z INFO dup',
        }),
        index: 10,
      },
      {
        line: createParsedLogLine({
          lineNumber: 11,
          rawText: '2024-01-15T10:00:01.000000Z INFO dup',
        }),
        index: 11,
      },
      {
        line: createParsedLogLine({
          lineNumber: 12,
          rawText: '2024-01-15T10:00:02.000000Z INFO dup',
        }),
        index: 12,
      },
      {
        line: createParsedLogLine({
          lineNumber: 13,
          rawText: '2024-01-15T10:00:03.000000Z INFO dup',
        }),
        index: 13,
      },
    ];

    const result = detectCollapseGroups(lines);

    expect(result.collapseGroups.has('down-10')).toBe(true);
    expect(result.collapseGroups.get('down-10')).toEqual({ type: 'exact', count: 3 });
  });

  it('does not collapse lines without filePath for similar check', () => {
    // Lines with no filePath/sourceLineNumber and different text should not collapse
    const lines: FilteredLine[] = [
      {
        line: createParsedLogLine({
          lineNumber: 0,
          rawText: '2024-01-15T10:00:00.000000Z INFO message alpha',
        }),
        index: 0,
      },
      {
        line: createParsedLogLine({
          lineNumber: 1,
          rawText: '2024-01-15T10:00:01.000000Z INFO message beta',
        }),
        index: 1,
      },
    ];

    const result = detectCollapseGroups(lines);
    expect(result.collapsedIndices.size).toBe(0);
  });
});
