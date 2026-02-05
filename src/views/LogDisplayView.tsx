import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLogStore } from '../stores/logStore';
import type { ParsedLogLine } from '../types/log.types';
import { buildDisplayItems, calculateGapExpansion, type ForcedRange } from '../utils/logGapManager';

interface LogDisplayViewProps {
  requestFilter?: string;
  defaultShowOnlyMatching?: boolean;
  defaultLineWrap?: boolean;
  onClose?: () => void;
  prevRequestLineRange?: { start: number; end: number };
  nextRequestLineRange?: { start: number; end: number };
  logLines?: ParsedLogLine[];
}

export function LogDisplayView({ requestFilter = '', defaultShowOnlyMatching: _defaultShowOnlyMatching = false, defaultLineWrap = false, onClose, prevRequestLineRange, nextRequestLineRange, logLines }: LogDisplayViewProps) {
  const { rawLogLines } = useLogStore();
  
  // Use passed logLines if provided, otherwise use all raw log lines from store
  const displayLogLines = logLines || rawLogLines;

  const [searchQueryInput, setSearchQueryInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQueryInput, setFilterQueryInput] = useState(requestFilter);
  const [filterQuery, setFilterQuery] = useState(requestFilter);
  const [contextLines, setContextLines] = useState(0);
  const [lineWrap, setLineWrap] = useState(defaultLineWrap);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [stripPrefix, setStripPrefix] = useState(true);
  const [currentSearchMatchIndex, setCurrentSearchMatchIndex] = useState(0);
  const [forcedRanges, setForcedRanges] = useState<ForcedRange[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    gapId: string;
    direction: 'up' | 'down';
    isFirst: boolean;
    isLast: boolean;
  } | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Debounce search input to avoid recalculating on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchQueryInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQueryInput]);

  // Debounce filter input to avoid recalculating on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterQuery(filterQueryInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterQueryInput]);

  // Filter determines which lines to show/hide (like old showOnlyMatching behavior)
  const filterMatchingLineIndices = useMemo(() => {
    if (!filterQuery.trim()) return new Set<number>();
    const query = caseSensitive ? filterQuery : filterQuery.toLowerCase();
    const indices = new Set<number>();

    displayLogLines.forEach((line, index) => {
      const haystack = caseSensitive ? line.rawText : line.rawText.toLowerCase();
      if (haystack.includes(query)) {
        indices.add(index);
      }
    });

    return indices;
  }, [displayLogLines, filterQuery, caseSensitive]);

  // Build the filtered lines based on filter query and context
  const filteredLines = useMemo(() => {
    const allLines = displayLogLines.map((line, index) => ({ line, index }));

    // If no filter, show all lines
    if (!filterQuery.trim()) return allLines;

    // If filter is set but no matches, show empty
    if (filterMatchingLineIndices.size === 0) return [];

    if (contextLines === 0) return allLines.filter(({ index }) => filterMatchingLineIndices.has(index));

    const linesToShow = new Set<number>();
    filterMatchingLineIndices.forEach((matchIndex) => {
      for (let i = Math.max(0, matchIndex - contextLines); i <= Math.min(displayLogLines.length - 1, matchIndex + contextLines); i++) {
        linesToShow.add(i);
      }
    });

    return allLines.filter(({ index }) => linesToShow.has(index));
  }, [displayLogLines, filterQuery, contextLines, filterMatchingLineIndices]);

  // Search determines highlighting within visible lines
  const searchMatchingLineIndices = useMemo(() => {
    if (!searchQuery.trim()) return new Set<number>();
    const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();
    const indices = new Set<number>();

    // Search only within filtered lines (respects active filter)
    filteredLines.forEach(({ line, index }) => {
      const haystack = caseSensitive ? line.rawText : line.rawText.toLowerCase();
      if (haystack.includes(query)) {
        indices.add(index);
      }
    });

    return indices;
  }, [filteredLines, searchQuery, caseSensitive]);

  // Convert search matches to sorted array for navigation
  const searchMatchesArray = useMemo(() => {
    return Array.from(searchMatchingLineIndices).sort((a, b) => a - b);
  }, [searchMatchingLineIndices]);

  // Reset current match index when search changes
  useEffect(() => {
    setCurrentSearchMatchIndex(0);
  }, [searchQuery, caseSensitive]);

  // Navigate to previous search match
  const goToPreviousMatch = () => {
    if (searchMatchesArray.length === 0) return;
    setCurrentSearchMatchIndex((prev) => (prev - 1 + searchMatchesArray.length) % searchMatchesArray.length);
  };

  // Navigate to next search match
  const goToNextMatch = () => {
    if (searchMatchesArray.length === 0) return;
    setCurrentSearchMatchIndex((prev) => (prev + 1) % searchMatchesArray.length);
  };

  // Build display items with gap indicators
  const displayItems = useMemo(() => {
    return buildDisplayItems(filteredLines, displayLogLines, forcedRanges);
  }, [filteredLines, displayLogLines, forcedRanges]);

  const displayIndices = useMemo(() => {
    return displayItems.map((item) => item.data.index);
  }, [displayItems]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: displayItems.length,
    getItemKey: (index) => `line-${displayItems[index]?.data.index ?? index}`,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (lineWrap ? 76 : 24),
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 20,
  });

  useEffect(() => {
    // Reset all measurements and force remeasure when wrap state or filters change
    rowVirtualizer.measurementsCache = [];
    rowVirtualizer.measure();
  }, [rowVirtualizer, lineWrap, contextLines, searchQuery, displayItems.length, forcedRanges, filterQuery]);

  // Auto-scroll to current search match
  useEffect(() => {
    if (searchMatchesArray.length === 0) return;
    
    const currentMatchLineNumber = searchMatchesArray[currentSearchMatchIndex];
    const displayItemIndex = displayItems.findIndex(item => item.data.index === currentMatchLineNumber);
    
    if (displayItemIndex !== -1) {
      // Find the actual DOM element and scroll it into view
      setTimeout(() => {
        const matchElement = document.querySelector(`.log-line[data-index="${displayItemIndex}"]`);
        if (matchElement) {
          matchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50); // Small delay to ensure element is rendered
    }
  }, [currentSearchMatchIndex, searchMatchesArray, displayItems]);

  const highlightText = (line: ParsedLogLine, originalIndex: number) => {
    const isMatch = searchMatchingLineIndices.has(originalIndex);
    if (!searchQuery || !isMatch) {
      return getDisplayText(line);
    }

    const displayText = getDisplayText(line);
    const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();
    const text = caseSensitive ? displayText : displayText.toLowerCase();

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let searchIndex = 0;

    while ((searchIndex = text.indexOf(query, lastIndex)) !== -1) {
      if (searchIndex > lastIndex) {
        parts.push(
          <span key={`text-${originalIndex}-${lastIndex}`}>
            {displayText.substring(lastIndex, searchIndex)}
          </span>
        );
      }
      parts.push(
        <mark key={`mark-${originalIndex}-${searchIndex}`} className="search-highlight">
          {displayText.substring(searchIndex, searchIndex + query.length)}
        </mark>
      );
      lastIndex = searchIndex + query.length;
    }

    if (lastIndex < displayText.length) {
      parts.push(
        <span key={`text-${originalIndex}-${lastIndex}`}>
          {displayText.substring(lastIndex)}
        </span>
      );
    }

    return <>{parts}</>;
  };

  const getLogLevelClass = (level: string) => `log-level-${level.toLowerCase()}`;

  const getDisplayText = (line: ParsedLogLine): string => {
    if (!stripPrefix) {
      return line.rawText;
    }
    // Strip ISO timestamp and log level from display (they're already shown in columns)
    // Pattern: "YYYY-MM-DDTHH:MM:SS.ffffffZ LEVEL " -> keep just the message part
    return line.rawText.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s+\w+\s+/, '');
  };

  // Expand a gap by including the missing lines
  const expandGap = (gapId: string, count: number | 'all' | 'next-match' | 'prev-match') => {
    const newForcedRanges = calculateGapExpansion(
      gapId,
      count,
      displayIndices,
      displayLogLines.length,
      forcedRanges,
      filterMatchingLineIndices,
      prevRequestLineRange,
      nextRequestLineRange
    );
    setForcedRanges(newForcedRanges);
  };

  // Handle gap expansion with click detection
  const handleGapClick = (gapId: string) => {
    // Single click: load 10 more
    expandGap(gapId, 10);
  };

  // Handle right-click to show context menu
  const handleGapContextMenu = (
    e: React.MouseEvent,
    gapId: string,
    direction: 'up' | 'down',
    isFirst: boolean,
    isLast: boolean
  ) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      gapId,
      direction,
      isFirst,
      isLast,
    });
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  return (
    <div className="log-display-view">
      <div className="log-toolbar">
        <div className="log-toolbar-left">
          <input
            type="text"
            className="log-search-input"
            placeholder="Search logs..."
            value={searchQueryInput}
            onChange={(e) => setSearchQueryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                  goToPreviousMatch();
                } else {
                  goToNextMatch();
                }
              }
            }}
            title="Search and highlight in filtered results"
          />
          <label className="log-toolbar-option">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            Case sensitive
          </label>
          {searchMatchesArray.length > 0 && (
            <>
              <div className="search-navigation">
                <button
                  className="btn-toolbar btn-icon"
                  onClick={goToPreviousMatch}
                  title="Previous match (Shift+Enter)"
                  disabled={searchMatchesArray.length === 0}
                >
                  ↑
                </button>
                <span className="search-results-count">
                  {currentSearchMatchIndex + 1} / {searchMatchesArray.length}
                </span>
                <button
                  className="btn-toolbar btn-icon"
                  onClick={goToNextMatch}
                  title="Next match (Enter)"
                  disabled={searchMatchesArray.length === 0}
                >
                  ↓
                </button>
              </div>
            </>
          )}
        </div>
        <div className="log-toolbar-right">
          <label className="log-toolbar-option">
            <input
              type="checkbox"
              checked={lineWrap}
              onChange={(e) => setLineWrap(e.target.checked)}
            />
            Line wrap
          </label>
          <label className="log-toolbar-option">
            <input
              type="checkbox"
              checked={stripPrefix}
              onChange={(e) => setStripPrefix(e.target.checked)}
            />
            Strip prefix
          </label>
          <input
            type="text"
            className="log-search-input"
            placeholder="Filter logs..."
            value={filterQueryInput}
            onChange={(e) => setFilterQueryInput(e.target.value)}
            title="Filter to show only matching lines"
          />
          <div className="log-toolbar-context-group">
            <button
              className={`btn-toolbar btn-context-toggle ${contextLines > 0 ? 'active' : ''}`}
              onClick={() => {
                if (contextLines > 0) {
                  setContextLines(0);
                } else {
                  setContextLines(5);
                }
              }}
              title="Context lines before/after matches"
              disabled={!filterQuery.trim()}
            >
              ≡
            </button>
            <input
              type="number"
              min="0"
              max="100"
              value={contextLines}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setContextLines(val);
              }}
              className="log-context-input"
              title="Context lines (0 = disabled)"
              disabled={!filterQuery.trim()}
            />
          </div>
          {onClose && (
            <button
              className="btn-toolbar btn-icon close-icon"
              onClick={onClose}
              aria-label="Close log viewer"
              title="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div ref={parentRef} className="log-content-wrapper">
        <div
          className="log-content"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = displayItems[virtualRow.index];
            if (!item) {
              return null;
            }
            const { line, index } = item.data;
            const isMatch = searchMatchingLineIndices.has(index);
            const isCurrentSearchMatch = searchMatchesArray.length > 0 && index === searchMatchesArray[currentSearchMatchIndex];
            const gapAbove = item.gapAbove;
            const gapBelow = item.gapBelow;

            return (
              <div
                key={`${virtualRow.key}-${lineWrap ? 'wrap' : 'nowrap'}`}
                data-index={virtualRow.index}
                ref={(el) => {
                  if (el) rowVirtualizer.measureElement(el);
                }}
                className={`log-line ${getLogLevelClass(line.level)} ${isMatch ? 'match-line' : ''} ${isCurrentSearchMatch ? 'current-match' : ''} ${lineWrap ? 'wrap' : 'nowrap'}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: lineWrap ? '100%' : 'fit-content',
                  minWidth: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {(gapAbove || gapBelow) && (
                  <div className="log-gap-controls">
                    {gapAbove && (
                      <button
                        className="log-gap-arrow log-gap-up"
                        onClick={() => handleGapClick(gapAbove.gapId)}
                        onContextMenu={(e) => handleGapContextMenu(e, gapAbove.gapId, 'up', gapAbove.isFirst ?? false, false)}
                        title={`${gapAbove.remainingGap} hidden lines above\nClick: +10 | Right-click: More options`}
                        aria-label={`Load hidden lines above`}
                      >
                        <svg viewBox="0 0 12 12" width="12" height="12">
                          <path d="M6 2 L10 7 L2 7 Z" fill="currentColor" />
                        </svg>
                      </button>
                    )}
                    {gapBelow && (
                      <button
                        className="log-gap-arrow log-gap-down"
                        onClick={() => handleGapClick(gapBelow.gapId)}
                        onContextMenu={(e) => handleGapContextMenu(e, gapBelow.gapId, 'down', false, gapBelow.isLast ?? false)}
                        title={`${gapBelow.remainingGap} hidden lines below\nClick: +10 | Right-click: More options`}
                        aria-label={`Load hidden lines below`}
                      >
                        <svg viewBox="0 0 12 12" width="12" height="12">
                          <path d="M6 10 L10 5 L2 5 Z" fill="currentColor" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
                {gapBelow && !gapBelow.isLast && <div className="log-gap-divider log-gap-divider-below" />}
                <span className="log-line-number">{line.lineNumber}</span>
                <span className="log-line-timestamp">{line.timestamp}</span>
                <span className="log-line-level">{line.level}</span>
                <span className="log-line-text">
                  {highlightText(line, index)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {displayItems.length === 0 && filteredLines.length > 0 && (
        <div className="log-empty-state">
          No matching lines found for "{searchQuery}"
        </div>
      )}

      {filteredLines.length === 0 && filterQuery && (
        <div className="log-empty-state">
          No lines match filter "{filterQuery}"
        </div>
      )}

      {displayLogLines.length === 0 && (
        <div className="log-empty-state">
          No log data available. Please upload a log file.
        </div>
      )}

      {contextMenu && (
        <div
          className="log-gap-context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 1000,
          }}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              expandGap(contextMenu.gapId, 10);
              setContextMenu(null);
            }}
          >
            Load 10 more lines
          </button>
          {contextMenu.direction === 'down' && nextRequestLineRange && (
            <button
              className="context-menu-item"
              onClick={() => {
                expandGap(contextMenu.gapId, 'next-match');
                setContextMenu(null);
              }}
            >
              Load to next log
            </button>
          )}
          {contextMenu.direction === 'up' && prevRequestLineRange && (
            <button
              className="context-menu-item"
              onClick={() => {
                expandGap(contextMenu.gapId, 'prev-match');
                setContextMenu(null);
              }}
            >
              Load to previous log
            </button>
          )}
          {((contextMenu.direction === 'up' && contextMenu.isFirst) ||
            (contextMenu.direction === 'down' && contextMenu.isLast)) && (
            <button
              className="context-menu-item"
              onClick={() => {
                expandGap(contextMenu.gapId, 'all');
                setContextMenu(null);
              }}
            >
              Load all to {contextMenu.direction === 'up' ? 'top' : 'bottom'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

