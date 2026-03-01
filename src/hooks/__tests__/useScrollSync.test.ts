import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useScrollSync } from '../useScrollSync';

/** Helper to create a mock div with controllable scrollTop */
function makeMockDiv() {
  const div = document.createElement('div');
  Object.defineProperty(div, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  return div;
}

describe('useScrollSync', () => {
  it('does not throw when refs are null', () => {
    const leftRef = { current: null };
    const rightRef = { current: null };
    expect(() => {
      renderHook(() => useScrollSync(
        leftRef as React.RefObject<HTMLDivElement | null>,
        rightRef as React.RefObject<HTMLDivElement | null>
      ));
    }).not.toThrow();
  });

  it('does not throw when only left ref is null', () => {
    const rightDiv = makeMockDiv();
    const leftRef = { current: null };
    const rightRef = { current: rightDiv };
    expect(() => {
      renderHook(() => useScrollSync(
        leftRef as React.RefObject<HTMLDivElement | null>,
        rightRef as React.RefObject<HTMLDivElement | null>
      ));
    }).not.toThrow();
  });

  it('does not throw when only right ref is null', () => {
    const leftDiv = makeMockDiv();
    const leftRef = { current: leftDiv };
    const rightRef = { current: null };
    expect(() => {
      renderHook(() => useScrollSync(
        leftRef as React.RefObject<HTMLDivElement | null>,
        rightRef as React.RefObject<HTMLDivElement | null>
      ));
    }).not.toThrow();
  });

  it('syncs scroll from left to right panel', () => {
    const leftDiv = makeMockDiv();
    const rightDiv = makeMockDiv();

    const leftRef = { current: leftDiv };
    const rightRef = { current: rightDiv };

    renderHook(() => useScrollSync(
      leftRef as React.RefObject<HTMLDivElement | null>,
      rightRef as React.RefObject<HTMLDivElement | null>
    ));

    // Simulate left scroll
    leftDiv.scrollTop = 200;
    leftDiv.dispatchEvent(new Event('scroll'));

    expect(rightDiv.scrollTop).toBe(200);
  });

  it('syncs scroll from right to left panel', () => {
    const leftDiv = makeMockDiv();
    const rightDiv = makeMockDiv();

    const leftRef = { current: leftDiv };
    const rightRef = { current: rightDiv };

    renderHook(() => useScrollSync(
      leftRef as React.RefObject<HTMLDivElement | null>,
      rightRef as React.RefObject<HTMLDivElement | null>
    ));

    // Simulate right scroll
    rightDiv.scrollTop = 150;
    rightDiv.dispatchEvent(new Event('scroll'));

    expect(leftDiv.scrollTop).toBe(150);
  });

  it('removes event listeners on unmount', () => {
    const leftDiv = makeMockDiv();
    const rightDiv = makeMockDiv();

    const removeSpy = vi.spyOn(leftDiv, 'removeEventListener');

    const leftRef = { current: leftDiv };
    const rightRef = { current: rightDiv };

    const { unmount } = renderHook(() => useScrollSync(
      leftRef as React.RefObject<HTMLDivElement | null>,
      rightRef as React.RefObject<HTMLDivElement | null>
    ));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('prevents feedback loop when syncing', () => {
    const leftDiv = makeMockDiv();
    const rightDiv = makeMockDiv();

    const leftRef = { current: leftDiv };
    const rightRef = { current: rightDiv };

    renderHook(() => useScrollSync(
      leftRef as React.RefObject<HTMLDivElement | null>,
      rightRef as React.RefObject<HTMLDivElement | null>
    ));

    // Track how many times rightDiv.scrollTop is assigned after left scroll
    let rightAssignCount = 0;
    const rightDescriptor = Object.getOwnPropertyDescriptor(rightDiv, 'scrollTop')!;
    Object.defineProperty(rightDiv, 'scrollTop', {
      get: () => rightDescriptor.value ?? 0,
      set: (v) => {
        rightAssignCount++;
        rightDescriptor.value = v;
      },
    });

    // Simulate left scroll
    leftDiv.scrollTop = 200;
    leftDiv.dispatchEvent(new Event('scroll'));

    // Right should be assigned exactly once (not in a loop)
    expect(rightAssignCount).toBe(1);
  });

  it('guard in handleRightScroll prevents re-entry when syncingRef is true', () => {
    const leftDiv = makeMockDiv();
    const rightDiv = makeMockDiv();

    const leftRef = { current: leftDiv };
    const rightRef = { current: rightDiv };

    renderHook(() => useScrollSync(
      leftRef as React.RefObject<HTMLDivElement | null>,
      rightRef as React.RefObject<HTMLDivElement | null>
    ));

    // Set initial scroll position before overriding the setter
    leftDiv.scrollTop = 200;

    // Override rightDiv.scrollTop setter to fire scroll event synchronously
    // This simulates the guard path: handleLeftScroll sets syncingRef=true,
    // then sets rightPanel.scrollTop, which fires a scroll event on rightPanel,
    // and handleRightScroll should return early because syncingRef.current is true.
    let rightScrollTopValue = 0;
    Object.defineProperty(rightDiv, 'scrollTop', {
      configurable: true,
      get: () => rightScrollTopValue,
      set: (v) => {
        rightScrollTopValue = v;
        rightDiv.dispatchEvent(new Event('scroll'));
      },
    });

    // Track left assignments (should be 0 because handleRightScroll returns early)
    const leftDescriptor = Object.getOwnPropertyDescriptor(leftDiv, 'scrollTop')!;
    let leftAssignCount = 0;
    Object.defineProperty(leftDiv, 'scrollTop', {
      configurable: true,
      get: () => leftDescriptor.value ?? 0,
      set: (v) => {
        leftAssignCount++;
        leftDescriptor.value = v;
      },
    });

    leftDiv.dispatchEvent(new Event('scroll'));

    // rightDiv.scrollTop was set to 200, which triggered handleRightScroll,
    // which returned early (syncingRef.current was true) without updating leftDiv
    expect(rightScrollTopValue).toBe(200);
    expect(leftAssignCount).toBe(0);
  });

  it('guard in handleLeftScroll prevents re-entry when syncingRef is true', () => {
    const leftDiv = makeMockDiv();
    const rightDiv = makeMockDiv();

    const leftRef = { current: leftDiv };
    const rightRef = { current: rightDiv };

    renderHook(() => useScrollSync(
      leftRef as React.RefObject<HTMLDivElement | null>,
      rightRef as React.RefObject<HTMLDivElement | null>
    ));

    // Set initial scroll position before overriding the setter
    rightDiv.scrollTop = 300;

    // Override leftDiv.scrollTop setter to fire scroll event synchronously
    // This simulates the guard path: handleRightScroll sets syncingRef=true,
    // then sets leftPanel.scrollTop, which fires a scroll event on leftPanel,
    // and handleLeftScroll should return early because syncingRef.current is true.
    let leftScrollTopValue = 0;
    Object.defineProperty(leftDiv, 'scrollTop', {
      configurable: true,
      get: () => leftScrollTopValue,
      set: (v) => {
        leftScrollTopValue = v;
        leftDiv.dispatchEvent(new Event('scroll'));
      },
    });

    // Track right assignments (should be 0 because handleLeftScroll returns early)
    const rightDescriptor = Object.getOwnPropertyDescriptor(rightDiv, 'scrollTop')!;
    let rightAssignCount2 = 0;
    Object.defineProperty(rightDiv, 'scrollTop', {
      configurable: true,
      get: () => rightDescriptor.value ?? 0,
      set: (v) => {
        rightAssignCount2++;
        rightDescriptor.value = v;
      },
    });

    rightDiv.dispatchEvent(new Event('scroll'));

    // leftDiv.scrollTop was set to 300, which triggered handleLeftScroll,
    // which returned early (syncingRef.current was true) without updating rightDiv
    expect(leftScrollTopValue).toBe(300);
    expect(rightAssignCount2).toBe(0);
  });
});
