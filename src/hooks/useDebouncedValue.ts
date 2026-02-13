import { useState, useEffect } from 'react';

/**
 * Hook that debounces a value, delaying updates until after the specified delay.
 *
 * Useful for search/filter inputs where you want to avoid recalculating on every keystroke.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [input, setInput] = useState('');
 *   const debouncedQuery = useDebouncedValue(input, 300);
 *
 *   // debouncedQuery only updates 300ms after the user stops typing
 *   useEffect(() => {
 *     performSearch(debouncedQuery);
 *   }, [debouncedQuery]);
 *
 *   return <input value={input} onChange={(e) => setInput(e.target.value)} />;
 * }
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
