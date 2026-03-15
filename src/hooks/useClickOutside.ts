import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Attaches a `mousedown` listener that fires `onClose` whenever the user clicks
 * outside the element referenced by `ref`. Automatically removes the listener
 * when `enabled` is false or when the component unmounts.
 *
 * The latest `onClose` value is always used without causing the listener to
 * be re-registered, so callers can pass an inline callback without wrapping it
 * in `useCallback`.
 *
 * Extracted from four components that all duplicated the same
 * `handleClickOutside / addEventListener / removeEventListener` pattern:
 * `BurgerMenu`, `TimelineScaleSelector`, `TimeRangeSelector`, `StatusFilterDropdown`.
 *
 * @param ref     - Ref to the container element; clicks outside it trigger `onClose`.
 * @param onClose - Callback fired when an outside click is detected.
 * @param enabled - Whether the listener is active. Defaults to `true`.
 *
 * @example
 * const containerRef = useRef<HTMLDivElement>(null);
 * useClickOutside(containerRef, () => setIsOpen(false), isOpen);
 */
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled = true
): void {
  // Keep a stable ref to the latest onClose so the event listener never needs
  // to be torn down and re-attached just because the callback identity changed.
  // useLayoutEffect keeps the ref in sync synchronously after every commit so
  // the handler always has the latest value before any user interaction fires.
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!enabled) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onCloseRef.current();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [ref, enabled]);
}
