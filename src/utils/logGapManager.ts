import type { ParsedLogLine } from '../types/log.types';

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

/**
 * Collects all line indices that should be displayed by cascading through expansions.
 * Used for both up and down directions.
 */
function collectExpandedLines(
  startAnchor: number,
  direction: 'up' | 'down',
  boundaryMin: number,
  boundaryMax: number,
  expandedGaps: Map<string, number>
): number[] {
  const linesToDisplay = new Set<number>();
  const toProcess: number[] = [startAnchor];

  while (toProcess.length > 0) {
    const anchor = toProcess.shift()!;
    const gapId = `${direction}-${anchor}`;
    const expanded = expandedGaps.get(gapId) || 0;

    if (direction === 'up') {
      for (let j = 1; j <= expanded; j++) {
        const idx = anchor - j;
        if (idx > boundaryMin && !linesToDisplay.has(idx)) {
          linesToDisplay.add(idx);
          toProcess.push(idx);
        }
      }
    } else {
      for (let j = 1; j <= expanded; j++) {
        const idx = anchor + j;
        if (idx < boundaryMax && !linesToDisplay.has(idx)) {
          linesToDisplay.add(idx);
          toProcess.push(idx);
        }
      }
    }
  }

  return Array.from(linesToDisplay).sort((a, b) => a - b);
}

/**
 * Builds the full list of display items including filtered lines and expanded gap lines.
 * This handles cascading expansions where expanded lines can themselves have expansions.
 */
export function buildDisplayItems(
  filteredLines: FilteredLine[],
  rawLogLines: ParsedLogLine[],
  expandedGaps: Map<string, number>
): DisplayItem[] {
  const items: DisplayItem[] = [];

  if (filteredLines.length === 0) {
    return items;
  }

  // Add expanded lines before the first filtered line (cascading up-expansions)
  const firstLineIndex = filteredLines[0].index;
  if (firstLineIndex > 0) {
    const expandedIndices = collectExpandedLines(
      firstLineIndex,
      'up',
      -1,
      firstLineIndex,
      expandedGaps
    );
    for (const idx of expandedIndices) {
      items.push({ type: 'line', data: { line: rawLogLines[idx], index: idx } });
    }
  }

  // Process each filtered line and gaps between them
  for (let i = 0; i < filteredLines.length; i++) {
    const currentOriginalIndex = filteredLines[i].index;

    // Add expanded lines above this line (cascading up-expansions within the gap)
    if (i > 0) {
      const prevOriginalIndex = filteredLines[i - 1].index;
      const gap = currentOriginalIndex - prevOriginalIndex - 1;

      if (gap > 0) {
        const expandedIndices = collectExpandedLines(
          currentOriginalIndex,
          'up',
          prevOriginalIndex,
          currentOriginalIndex,
          expandedGaps
        );
        for (const idx of expandedIndices) {
          items.push({ type: 'line', data: { line: rawLogLines[idx], index: idx } });
        }
      }
    }

    // Push the current filtered line
    items.push({ type: 'line', data: filteredLines[i] });

    // Handle gaps after this line (down expansion with cascading support)
    if (i < filteredLines.length - 1) {
      const nextOriginalIndex = filteredLines[i + 1].index;
      const expandedIndices = collectExpandedLines(
        currentOriginalIndex,
        'down',
        currentOriginalIndex,
        nextOriginalIndex,
        expandedGaps
      );
      for (const idx of expandedIndices) {
        items.push({ type: 'line', data: { line: rawLogLines[idx], index: idx } });
      }
    } else {
      // Handle gap after the last filtered line to the end of file (with cascading)
      const expandedIndices = collectExpandedLines(
        currentOriginalIndex,
        'down',
        currentOriginalIndex,
        rawLogLines.length,
        expandedGaps
      );
      for (const idx of expandedIndices) {
        items.push({ type: 'line', data: { line: rawLogLines[idx], index: idx } });
      }
    }
  }

  // Assign gapAbove/gapBelow based on displayed neighbors
  const displayIndices = items.map((it) => it.data.index);
  for (let i = 0; i < items.length; i++) {
    const currentIndex = displayIndices[i];
    const prevIndex = i > 0 ? displayIndices[i - 1] : null;
    const nextIndex = i < items.length - 1 ? displayIndices[i + 1] : null;

    // Gap above
    const aboveGapSize = prevIndex === null ? currentIndex : currentIndex - prevIndex - 1;
    if (aboveGapSize > 0) {
      const gapId = `up-${currentIndex}`;
      const alreadyExpanded = expandedGaps.get(gapId) || 0;
      const remainingGap = Math.max(0, aboveGapSize - alreadyExpanded);
      if (remainingGap > 0) {
        items[i].gapAbove = {
          gapId,
          gapSize: aboveGapSize,
          remainingGap,
          isFirst: prevIndex === null,
        };
      }
    }

    // Gap below
    const belowGapSize =
      nextIndex === null ? rawLogLines.length - 1 - currentIndex : nextIndex - currentIndex - 1;
    if (belowGapSize > 0) {
      const gapId = `down-${currentIndex}`;
      const alreadyExpanded = expandedGaps.get(gapId) || 0;
      const remainingGap = Math.max(0, belowGapSize - alreadyExpanded);
      if (remainingGap > 0) {
        items[i].gapBelow = {
          gapId,
          gapSize: belowGapSize,
          remainingGap,
          isLast: nextIndex === null,
        };
      }
    }
  }

  return items;
}

/**
 * Calculates the new expanded gaps map after expanding a gap.
 * Returns the updated map if expansion is valid, or the original map if not.
 */
export function calculateGapExpansion(
  gapId: string,
  count: number | 'all' | 'next-match' | 'prev-match',
  filteredLines: FilteredLine[],
  totalLines: number,
  currentExpandedGaps: Map<string, number>,
  _matchingIndices?: Set<number>,
  prevRequestLineRange?: { start: number; end: number },
  nextRequestLineRange?: { start: number; end: number }
): Map<string, number> {
  const isUpGap = gapId.startsWith('up-');
  const isDownGap = gapId.startsWith('down-');
  
  if (!isUpGap && !isDownGap) {
    return currentExpandedGaps;
  }

  const anchorIndex = parseInt(gapId.replace(/^(up|down)-/, ''));
  const filteredIndices = filteredLines.map((f) => f.index);

  let gapStart: number;
  let gapEnd: number;

  if (isUpGap) {
    // Gap above: from previous line to current line
    const prevAnchor = [...filteredIndices].reverse().find((idx) => idx < anchorIndex);
    gapStart = prevAnchor !== undefined ? prevAnchor : -1;
    gapEnd = anchorIndex;
  } else {
    // Gap below: from current line to next line
    gapStart = anchorIndex;
    const nextAnchor = filteredIndices.find((idx) => idx > anchorIndex);
    gapEnd = nextAnchor !== undefined ? nextAnchor : totalLines;
  }

  const totalGap = gapEnd - gapStart - 1;
  if (totalGap <= 0) {
    return currentExpandedGaps;
  }

  const currentExpanded = currentExpandedGaps.get(gapId) || 0;
  const remaining = totalGap - currentExpanded;
  
  if (remaining <= 0) {
    return currentExpandedGaps;
  }

  let linesToAdd: number;

  if (count === 'all') {
    linesToAdd = remaining;
  } else if (count === 'next-match' && nextRequestLineRange) {
    // Expand until we reach the start of the next request
    if (isDownGap) {
      const targetLine = nextRequestLineRange.start;
      if (targetLine > anchorIndex && targetLine <= gapEnd) {
        linesToAdd = Math.min(targetLine - anchorIndex, remaining);
      } else {
        linesToAdd = remaining;
      }
    } else {
      linesToAdd = remaining;
    }
  } else if (count === 'prev-match' && prevRequestLineRange) {
    // Expand until we reach the end of the previous request
    if (isUpGap) {
      const targetLine = prevRequestLineRange.end;
      if (targetLine < anchorIndex && targetLine >= gapStart) {
        linesToAdd = Math.min(anchorIndex - targetLine, remaining);
      } else {
        linesToAdd = remaining;
      }
    } else {
      linesToAdd = remaining;
    }
  } else if (typeof count === 'number') {
    linesToAdd = Math.min(count, remaining);
  } else {
    linesToAdd = remaining;
  }

  const newExpandedGaps = new Map(currentExpandedGaps);
  newExpandedGaps.set(gapId, currentExpanded + linesToAdd);
  return newExpandedGaps;
}

/**
 * Gets gap information for a specific line index within the context of displayed items.
 */
export function getGapInfoForLine(
  lineIndex: number,
  displayedIndices: number[],
  totalLines: number,
  expandedGaps: Map<string, number>
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
    const gapId = `up-${lineIndex}`;
    const alreadyExpanded = expandedGaps.get(gapId) || 0;
    const remainingGap = Math.max(0, aboveGapSize - alreadyExpanded);
    if (remainingGap > 0) {
      result.up = {
        gapId,
        gapSize: aboveGapSize,
        remainingGap,
        isFirst: prevIndex === null,
      };
    }
  }

  // Gap below
  const belowGapSize = nextIndex === null ? totalLines - 1 - lineIndex : nextIndex - lineIndex - 1;
  if (belowGapSize > 0) {
    const gapId = `down-${lineIndex}`;
    const alreadyExpanded = expandedGaps.get(gapId) || 0;
    const remainingGap = Math.max(0, belowGapSize - alreadyExpanded);
    if (remainingGap > 0) {
      result.down = {
        gapId,
        gapSize: belowGapSize,
        remainingGap,
        isLast: nextIndex === null,
      };
    }
  }

  return result;
}
