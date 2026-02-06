import { useRef, useState, useEffect, useCallback } from 'react';
import { useLogStore } from '../stores/logStore';
import { PENDING_STATUS_KEY } from '../utils/statusCodeUtils';

interface StatusFilterDropdownProps {
  /** Available status codes to show in the dropdown */
  availableStatusCodes: string[];
}

/**
 * Multi-select dropdown for filtering requests by HTTP status code.
 * Reads/writes statusCodeFilter from the global store.
 */
export function StatusFilterDropdown({ availableStatusCodes }: StatusFilterDropdownProps) {
  const { statusCodeFilter, setStatusCodeFilter } = useLogStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /** Toggle a status code in the filter */
  const toggleStatusCode = useCallback((code: string) => {
    if (statusCodeFilter === null) {
      // Currently showing all - switch to all except this one
      const newFilter = new Set(availableStatusCodes.filter(c => c !== code));
      setStatusCodeFilter(newFilter);
    } else if (statusCodeFilter.has(code)) {
      // Remove this code from filter
      const newFilter = new Set(statusCodeFilter);
      newFilter.delete(code);
      // If no codes selected, reset to null (show all)
      setStatusCodeFilter(newFilter.size === 0 ? null : newFilter);
    } else {
      // Add this code to filter
      const newFilter = new Set(statusCodeFilter);
      newFilter.add(code);
      // If all codes now selected, reset to null (show all)
      if (newFilter.size === availableStatusCodes.length) {
        setStatusCodeFilter(null);
      } else {
        setStatusCodeFilter(newFilter);
      }
    }
  }, [statusCodeFilter, availableStatusCodes, setStatusCodeFilter]);

  /** Select all status codes (reset filter) */
  const selectAll = useCallback(() => {
    setStatusCodeFilter(null);
  }, [setStatusCodeFilter]);

  /** Check if a status code is enabled */
  const isEnabled = (code: string) => {
    return statusCodeFilter === null || statusCodeFilter.has(code);
  };

  /** Get CSS class for status code coloring */
  const getStatusClass = (code: string) => {
    if (code === PENDING_STATUS_KEY) return 'pending';
    const numCode = parseInt(code, 10);
    if (!isNaN(numCode) && numCode < 400) return 'success';
    return 'error';
  };

  /** Get label for the dropdown button */
  const buttonLabel = statusCodeFilter === null
    ? 'All Status'
    : statusCodeFilter.size === 1
      ? Array.from(statusCodeFilter)[0]
      : `${statusCodeFilter.size} selected`;

  return (
    <div className="status-filter-container" ref={dropdownRef}>
      <button
        className="status-filter-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Filter by status code"
      >
        {buttonLabel}
        <span className="dropdown-arrow">▾</span>
      </button>
      {isOpen && (
        <div className="status-filter-dropdown">
          <button
            className="status-filter-select-all"
            onClick={selectAll}
          >
            Select All
          </button>
          <div className="status-filter-divider" />
          {availableStatusCodes.map((code) => (
            <label key={code} className="status-filter-option">
              <input
                type="checkbox"
                checked={isEnabled(code)}
                onChange={() => toggleStatusCode(code)}
              />
              <span className={`status-code-label ${getStatusClass(code)}`}>
                {code}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
