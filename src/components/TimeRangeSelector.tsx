import { useState, useRef, useEffect } from 'react';
import { useLogStore } from '../stores/logStore';
import { getTimeDisplayName, parseTimeInput } from '../utils/timeUtils';

const SHORTCUTS = [
  { value: 'last-min', label: 'Last min' },
  { value: 'last-5-min', label: 'Last 5 min' },
  { value: 'last-10-min', label: 'Last 10 min' },
  { value: 'last-hour', label: 'Last hour' },
  { value: 'last-day', label: 'Last day' },
];

export function TimeRangeSelector() {
  const { startTime, endTime, setTimeFilter } = useLogStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState(startTime || '');
  const [customEnd, setCustomEnd] = useState(endTime || '');
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustom(false);
        setError('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleShortcut = (shortcut: string) => {
    setTimeFilter(shortcut, 'end');
    setIsOpen(false);
    setShowCustom(false);
    setError('');
  };

  const handleClear = () => {
    setTimeFilter(null, null);
    setCustomStart('');
    setCustomEnd('');
    setIsOpen(false);
    setShowCustom(false);
    setError('');
  };

  const handleCustomApply = () => {
    const start = customStart.trim();
    const end = customEnd.trim();

    if (!start && !end) {
      setError('Please enter at least a start or end time');
      return;
    }

    const validStart = !start || parseTimeInput(start);
    const validEnd = !end || parseTimeInput(end);

    if (!validStart) {
      setError(`Invalid start time: "${start}"`);
      return;
    }

    if (!validEnd) {
      setError(`Invalid end time: "${end}"`);
      return;
    }

    setTimeFilter(
      typeof validStart === 'string' ? validStart : null,
      typeof validEnd === 'string' ? validEnd : null
    );
    setIsOpen(false);
    setShowCustom(false);
    setError('');
  };

  const getDisplayText = () => {
    if (!startTime && !endTime) {
      return 'All time';
    }
    const startName = startTime ? getTimeDisplayName(startTime) : 'Start';
    const endName = endTime ? getTimeDisplayName(endTime) : 'End';
    
    // Shorten display for common patterns
    if (startTime && startTime.startsWith('last-') && endTime === 'end') {
      return getTimeDisplayName(startTime);
    }
    
    return `${startName} to ${endName}`;
  };

  return (
    <div className="time-range-selector" ref={dropdownRef}>
      <button
        className="time-range-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select time range"
        aria-expanded={isOpen}
      >
        <span className="time-range-icon">⏱</span>
        <span className="time-range-text">{getDisplayText()}</span>
        <span className="time-range-arrow">{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen && (
        <div className="time-range-dropdown">
          <div className="time-range-shortcuts">
            {SHORTCUTS.map((shortcut) => (
              <button
                key={shortcut.value}
                className={`time-range-item ${startTime === shortcut.value ? 'active' : ''}`}
                onClick={() => handleShortcut(shortcut.value)}
              >
                {shortcut.label}
              </button>
            ))}
          </div>

          <div className="time-range-divider" />

          {!showCustom ? (
            <>
              <button
                className="time-range-item"
                onClick={() => setShowCustom(true)}
              >
                Custom range...
              </button>
              {(startTime || endTime) && (
                <button
                  className="time-range-item time-range-clear"
                  onClick={handleClear}
                >
                  Clear filter
                </button>
              )}
            </>
          ) : (
            <div className="time-range-custom">
              <div className="custom-input-group">
                <label>From:</label>
                <input
                  type="text"
                  placeholder="start, last-5-min, 1970-01-01T12:34:56.123456Z"
                  value={customStart}
                  onChange={(e) => {
                    setCustomStart(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomApply();
                  }}
                  autoFocus
                />
              </div>
              <div className="custom-input-group">
                <label>To:</label>
                <input
                  type="text"
                  placeholder="end, 1970-01-01T12:34:56.123456Z"
                  value={customEnd}
                  onChange={(e) => {
                    setCustomEnd(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomApply();
                  }}
                />
              </div>
              {error && <div className="time-range-error">{error}</div>}
              <div className="custom-actions">
                <button className="btn-secondary btn-sm" onClick={() => setShowCustom(false)}>
                  Cancel
                </button>
                <button className="btn-primary btn-sm" onClick={handleCustomApply}>
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
