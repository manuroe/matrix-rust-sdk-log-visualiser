import type { ParsedLogLine } from '../types/log.types';

/**
 * # Gap Expansion Manager
 *
 * Manages gap expansion for virtualized log display, replacing hidden lines with expanded ranges.
 *
 * ## Architecture
 *
 * Instead of cascading expansion logic, this module uses:
 *
 * **Forced Ranges**: Inclusive-exclusive [start, end) index ranges that must be displayed.
 * When a gap is expanded, a new forced range is computed and merged with existing ranges.
 *
 * **Display Items**: Derived from filtered lines + forced ranges.
 * Gaps are recomputed based on displayed neighbors, not expansion state.
 *
 * **Gap Calculation**: Simple neighbor-based logic:
 * - For each displayed line, gap size = next displayed line index - current index - 1
 * - Remaining gap always equals gap size (no subtracting expansion count)
 *
 * ## Gap Expansion Diagram
 *
 * Filtered display (T = shown, . = hidden):
 *
 * Index:   0  1  2  3  4  5  6  7  8  9
 * Line:    T  .  .  T  .  .  .  .  T  .
 *          ▲     gap     ▲     gap     ▲
 *       display         display    display
 *          [start:1, end:3)
 *
 * After expanding +1:
 *        T  T  .  T  .  T  .  .  T  .
 *          ▲     gap(reduced)  ▲  forced
 *
 * ## Expansion Modes
 *
 * - `+10` or `+N`: Expand N lines (capped to available gap)
 * - `all`: Expand entire remaining gap
 * - `next-match`: Expand to next matching line (prefers request boundary if provided)
 * - `prev-match`: Expand to prev matching line (prefers request boundary if provided)
 *
 * ## Helper Functions
 *
 * - `mergeRanges()`: Merge overlapping/adjacent ranges
 * - `normalizeRange()`: Clamp range to valid bounds
 * - `areRangesEqual()`: Reference equality check
 * - `findNextMatch()`: Find next match after anchor
 * - `findPrevMatch()`: Find previous match before anchor
 */

export interface GapInfo {
  gapId: string;
  gapSize: number;
  remainingGap: number;
  isFirst?: boolean;
  isLast?: boolean;
}

export interface DisplayItem {
  type: 'line';
  data: {
    line: ParsedLogLine;
    index: number;
  };
  gapAbove?: GapInfo;
  gapBelow?: GapInfo;
}

export interface FilteredLine {
  line: ParsedLogLine;
  index: number;
}

export interface ForcedRange {
  /** Inclusive start, exclusive end (i.e., [start, end)) */
  start: number;
  end: number;
}

/**
 * Merges overlapping or adjacent forced ranges.
 * Forced ranges are inclusive-exclusive: [start, end).
 */
function mergeRanges(ranges: ForcedRange[]): ForcedRange[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: ForcedRange[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function normalizeRange(range: ForcedRange, totalLines: number): ForcedRange | null {
  const start = Math.max(0, Math.min(range.start, totalLines));
  const end = Math.max(0, Math.min(range.end, totalLines));
  if (end <= start) return null;
  return { start, end };
}

function areRangesEqual(a: ForcedRange[], b: ForcedRange[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].start !== b[i].start || a[i].end !== b[i].end) return false;
  }
  return true;
}

function findNextMatch(anchor: number, gapEnd: number, matchingIndices?: Set<number>): number | null {
  if (!matchingIndices || matchingIndices.size === 0) return null;
  let best: number | null = null;
  matchingIndices.forEach((idx) => {
    if (idx > anchor && idx < gapEnd) {
      if (best === null || idx < best) best = idx;
    }
  });
  return best;
}

function findPrevMatch(anchor: number, gapStart: number, matchingIndices?: Set<number>): number | null {
  if (!matchingIndices || matchingIndices.size === 0) return null;
  let best: number | null = null;
  matchingIndices.forEach((idx) => {
    if (idx < anchor && idx > gapStart) {
      if (best === null || idx > best) best = idx;
    }
  });
  return best;
}

/**
 * Builds the full list of display items including filtered lines and forced ranges.
 * Forced ranges are inclusive-exclusive: [start, end).
 */
export function buildDisplayItems(
  filteredLines: FilteredLine[],
  rawLogLines: ParsedLogLine[],
  forcedRanges: ForcedRange[]
): DisplayItem[] {
  const items: DisplayItem[] = [];

  if (filteredLines.length === 0) {
    return items;
  }

  const displayIndicesSet = new Set<number>(filteredLines.map((line) => line.index));
  const mergedForcedRanges = mergeRanges(
    forcedRanges
      .map((range) => normalizeRange(range, rawLogLines.length))
      .filter((range): range is ForcedRange => range !== null)
  );

  mergedForcedRanges.forEach((range) => {
    for (let i = range.start; i < range.end; i++) {
      displayIndicesSet.add(i);
    }
  });

  const displayIndices = Array.from(displayIndicesSet).sort((a, b) => a - b);

  for (const index of displayIndices) {
    items.push({ type: 'line', data: { line: rawLogLines[index], index } });
  }

  // Assign gapAbove/gapBelow based on displayed neighbors
  for (let i = 0; i < items.length; i++) {
    const currentIndex = displayIndices[i];
    const prevIndex = i > 0 ? displayIndices[i - 1] : null;
    const nextIndex = i < items.length - 1 ? displayIndices[i + 1] : null;

    // Gap above
    const aboveGapSize = prevIndex === null ? currentIndex : currentIndex - prevIndex - 1;
    if (aboveGapSize > 0) {
      items[i].gapAbove = {
        gapId: `up-${currentIndex}`,
        gapSize: aboveGapSize,
        remainingGap: aboveGapSize,
        isFirst: prevIndex === null,
      };
    }

    // Gap below
    const belowGapSize =
      nextIndex === null ? rawLogLines.length - 1 - currentIndex : nextIndex - currentIndex - 1;
    if (belowGapSize > 0) {
      items[i].gapBelow = {
        gapId: `down-${currentIndex}`,
        gapSize: belowGapSize,
        remainingGap: belowGapSize,
        isLast: nextIndex === null,
      };
    }
  }

  return items;
}

/**
 * Calculates the new forced ranges after expanding a gap.
 * Returns the updated ranges if expansion is valid, or the original reference if not.
 */
export function calculateGapExpansion(
  gapId: string,
  count: number | 'all' | 'next-match' | 'prev-match',
  displayedIndices: number[],
  totalLines: number,
  currentForcedRanges: ForcedRange[],
  matchingIndices?: Set<number>,
  prevRequestLineRange?: { start: number; end: number },
  nextRequestLineRange?: { start: number; end: number }
): ForcedRange[] {
  const isUpGap = gapId.startsWith('up-');
  const isDownGap = gapId.startsWith('down-');

  if (!isUpGap && !isDownGap) {
    return currentForcedRanges;
  }

  const anchorIndex = Number.parseInt(gapId.replace(/^(up|down)-/, ''), 10);
  if (Number.isNaN(anchorIndex)) {
    return currentForcedRanges;
  }

  const anchorPosition = displayedIndices.indexOf(anchorIndex);
  if (anchorPosition === -1) {
    return currentForcedRanges;
  }

  const prevIndex = anchorPosition > 0 ? displayedIndices[anchorPosition - 1] : null;
  const nextIndex =
    anchorPosition < displayedIndices.length - 1 ? displayedIndices[anchorPosition + 1] : null;

  const gapStart = isUpGap ? (prevIndex ?? -1) : anchorIndex;
  const gapEnd = isUpGap ? anchorIndex : (nextIndex ?? totalLines);

  const totalGap = gapEnd - gapStart - 1;
  if (totalGap <= 0) {
    return currentForcedRanges;
  }

  let newRange: ForcedRange | null = null;

  if (count === 'all') {
    newRange = { start: gapStart + 1, end: gapEnd };
  } else if (count === 'next-match') {
    if (isDownGap) {
      const targetFromRequest = nextRequestLineRange?.start ?? null;
      const targetFromMatches = findNextMatch(anchorIndex, gapEnd, matchingIndices);
      const targetLine =
        targetFromRequest !== null && targetFromRequest > anchorIndex && targetFromRequest < gapEnd
          ? targetFromRequest
          : targetFromMatches;

      newRange = targetLine === null
        ? { start: gapStart + 1, end: gapEnd }
        : { start: anchorIndex + 1, end: targetLine + 1 };
    } else {
      newRange = { start: gapStart + 1, end: gapEnd };
    }
  } else if (count === 'prev-match') {
    if (isUpGap) {
      const targetFromRequest = prevRequestLineRange?.end ?? null;
      const targetFromMatches = findPrevMatch(anchorIndex, gapStart, matchingIndices);
      const targetLine =
        targetFromRequest !== null && targetFromRequest < anchorIndex && targetFromRequest > gapStart
          ? targetFromRequest
          : targetFromMatches;

      newRange = targetLine === null
        ? { start: gapStart + 1, end: gapEnd }
        : { start: targetLine, end: anchorIndex };
    } else {
      newRange = { start: gapStart + 1, end: gapEnd };
    }
  } else if (typeof count === 'number') {
    const linesToAdd = Math.min(Math.max(0, count), totalGap);
    if (linesToAdd <= 0) return currentForcedRanges;
    if (isUpGap) {
      newRange = { start: anchorIndex - linesToAdd, end: anchorIndex };
    } else {
      newRange = { start: anchorIndex + 1, end: anchorIndex + 1 + linesToAdd };
    }
  } else {
    newRange = { start: gapStart + 1, end: gapEnd };
  }

  if (!newRange) return currentForcedRanges;

  const normalized = normalizeRange(newRange, totalLines);
  if (!normalized) return currentForcedRanges;

  const merged = mergeRanges([...currentForcedRanges, normalized]);
  return areRangesEqual(merged, currentForcedRanges) ? currentForcedRanges : merged;
}

/**
 * Gets gap information for a specific line index within the context of displayed items.
 */
export function getGapInfoForLine(
  lineIndex: number,
  displayedIndices: number[],
  totalLines: number
): { up?: GapInfo; down?: GapInfo } {
  const currentIndexInDisplay = displayedIndices.indexOf(lineIndex);
  if (currentIndexInDisplay === -1) {
    return {};
  }

  const result: { up?: GapInfo; down?: GapInfo } = {};

  const prevIndex = currentIndexInDisplay > 0 ? displayedIndices[currentIndexInDisplay - 1] : null;
  const nextIndex =
    currentIndexInDisplay < displayedIndices.length - 1
      ? displayedIndices[currentIndexInDisplay + 1]
      : null;

  // Gap above
  const aboveGapSize = prevIndex === null ? lineIndex : lineIndex - prevIndex - 1;
  if (aboveGapSize > 0) {
    result.up = {
      gapId: `up-${lineIndex}`,
      gapSize: aboveGapSize,
      remainingGap: aboveGapSize,
      isFirst: prevIndex === null,
    };
  }

  // Gap below
  const belowGapSize = nextIndex === null ? totalLines - 1 - lineIndex : nextIndex - lineIndex - 1;
  if (belowGapSize > 0) {
    result.down = {
      gapId: `down-${lineIndex}`,
      gapSize: belowGapSize,
      remainingGap: belowGapSize,
      isLast: nextIndex === null,
    };
  }

  return result;
}
