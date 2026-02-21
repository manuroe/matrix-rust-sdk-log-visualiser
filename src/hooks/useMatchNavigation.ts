import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Return type for useMatchNavigation hook.
 */
export interface MatchNavigationResult {
  /** Current match index (0-based) */
  currentIndex: number;
  /** Navigate to the previous match (circular) */
  goToPrevious: () => void;
  /** Navigate to the next match (circular) */
  goToNext: () => void;
  /** Reset to the first match */
  reset: () => void;
  /** Total number of matches */
  matchCount: number;
  /** Current match in 1-based display format (e.g., "3 / 10") */
  displayPosition: string;
}

/**
 * Hook for navigating through a list of matches with circular wrap-around.
 *
 * Automatically resets to the first match when the number of matches changes.
 *
 * @param matchesArray - Sorted array of match indices or values
 * @returns Navigation controls and current position
 *
 * @example
 * ```tsx
 * function SearchResults({ matches }: { matches: number[] }) {
 *   const { currentIndex, goToNext, goToPrevious, displayPosition } = useMatchNavigation(matches);
 *
 *   return (
 *     <div>
 *       <button onClick={goToPrevious}>↑</button>
 *       <span>{displayPosition}</span>
 *       <button onClick={goToNext}>↓</button>
 *       <div>Current match at line: {matches[currentIndex]}</div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMatchNavigation<T>(matchesArray: T[]): MatchNavigationResult {
  const [currentIndex, setCurrentIndex] = useState(0);
  const prevLengthRef = useRef(matchesArray.length);

  // Reset to first match only when the array length actually changes
  // This avoids resetting on every render due to new array references
  useEffect(() => {
    if (matchesArray.length !== prevLengthRef.current) {
      setCurrentIndex(0);
      prevLengthRef.current = matchesArray.length;
    }
  }, [matchesArray.length]);

  const goToPrevious = useCallback(() => {
    if (matchesArray.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + matchesArray.length) % matchesArray.length);
  }, [matchesArray.length]);

  const goToNext = useCallback(() => {
    if (matchesArray.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % matchesArray.length);
  }, [matchesArray.length]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  const displayPosition =
    matchesArray.length > 0 ? `${currentIndex + 1} / ${matchesArray.length}` : '0 / 0';

  return {
    currentIndex,
    goToPrevious,
    goToNext,
    reset,
    matchCount: matchesArray.length,
    displayPosition,
  };
}
