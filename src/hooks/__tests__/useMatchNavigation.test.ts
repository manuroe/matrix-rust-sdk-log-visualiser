import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMatchNavigation } from '../useMatchNavigation';

describe('useMatchNavigation', () => {
  it('starts at index 0', () => {
    const { result } = renderHook(() => useMatchNavigation([10, 20, 30]));
    expect(result.current.currentIndex).toBe(0);
  });

  it('returns correct match count', () => {
    const { result } = renderHook(() => useMatchNavigation([10, 20, 30]));
    expect(result.current.matchCount).toBe(3);
  });

  it('returns correct display position', () => {
    const { result } = renderHook(() => useMatchNavigation([10, 20, 30]));
    expect(result.current.displayPosition).toBe('1 / 3');
  });

  it('handles empty matches array', () => {
    const { result } = renderHook(() => useMatchNavigation([]));
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.matchCount).toBe(0);
    expect(result.current.displayPosition).toBe('0 / 0');
  });

  describe('goToNext', () => {
    it('advances to next match', () => {
      const { result } = renderHook(() => useMatchNavigation([10, 20, 30]));

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.displayPosition).toBe('2 / 3');
    });

    it('wraps around to first match', () => {
      const { result } = renderHook(() => useMatchNavigation([10, 20, 30]));

      act(() => {
        result.current.goToNext();
        result.current.goToNext();
        result.current.goToNext();
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.displayPosition).toBe('1 / 3');
    });

    it('does nothing for empty array', () => {
      const { result } = renderHook(() => useMatchNavigation([]));

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe('goToPrevious', () => {
    it('goes to previous match', () => {
      const { result } = renderHook(() => useMatchNavigation([10, 20, 30]));

      act(() => {
        result.current.goToNext();
        result.current.goToNext();
        result.current.goToPrevious();
      });

      expect(result.current.currentIndex).toBe(1);
    });

    it('wraps around to last match from first', () => {
      const { result } = renderHook(() => useMatchNavigation([10, 20, 30]));

      act(() => {
        result.current.goToPrevious();
      });

      expect(result.current.currentIndex).toBe(2);
      expect(result.current.displayPosition).toBe('3 / 3');
    });

    it('does nothing for empty array', () => {
      const { result } = renderHook(() => useMatchNavigation([]));

      act(() => {
        result.current.goToPrevious();
      });

      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe('reset', () => {
    it('resets to first match', () => {
      const { result } = renderHook(() => useMatchNavigation([10, 20, 30]));

      act(() => {
        result.current.goToNext();
        result.current.goToNext();
        result.current.reset();
      });

      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe('matches array changes', () => {
    it('resets to 0 when matches array changes', () => {
      const { result, rerender } = renderHook(({ matches }) => useMatchNavigation(matches), {
        initialProps: { matches: [10, 20, 30] },
      });

      act(() => {
        result.current.goToNext();
        result.current.goToNext();
      });

      expect(result.current.currentIndex).toBe(2);

      // Change the matches array
      rerender({ matches: [100, 200] });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.matchCount).toBe(2);
    });
  });

  describe('single match', () => {
    it('handles single match correctly', () => {
      const { result } = renderHook(() => useMatchNavigation([42]));

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.matchCount).toBe(1);
      expect(result.current.displayPosition).toBe('1 / 1');

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.currentIndex).toBe(0);

      act(() => {
        result.current.goToPrevious();
      });

      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe('works with different types', () => {
    it('works with string matches', () => {
      const { result } = renderHook(() => useMatchNavigation(['a', 'b', 'c']));

      expect(result.current.matchCount).toBe(3);

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.currentIndex).toBe(1);
    });

    it('works with object matches', () => {
      const matches = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const { result } = renderHook(() => useMatchNavigation(matches));

      expect(result.current.matchCount).toBe(3);

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.currentIndex).toBe(1);
    });
  });
});
