import { useState } from 'react';
import { useLogStore } from '../stores/logStore';
import { getTimeDisplayName, parseTimeInput } from '../utils/timeUtils';

const SHORTCUTS = [
  { value: 'last-min', label: 'Last min' },
  { value: 'last-5-min', label: 'Last 5 min' },
  { value: 'last-10-min', label: 'Last 10 min' },
  { value: 'last-hour', label: 'Last hour' },
  { value: 'last-day', label: 'Last day' },
];

export function TimeFilter() {
  const { startTime, endTime, setTimeFilter } = useLogStore();
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState(startTime || '');
  const [customEnd, setCustomEnd] = useState(endTime || '');
  const [error, setError] = useState('');

  const handleShortcut = (shortcut: string) => {
    setTimeFilter(shortcut, 'end');
    setShowCustom(false);
    setError('');
  };

  const handleClear = () => {
    setTimeFilter(null, null);
    setCustomStart('');
    setCustomEnd('');
    setShowCustom(false);
    setError('');
  };

  const handleCustomApply = () => {
    // Validate inputs
    const start = customStart.trim();
    const end = customEnd.trim();

    if (!start && !end) {
      setError('Please enter at least a start or end time');
      return;
    }

    const validStart = !start || parseTimeInput(start);
    const validEnd = !end || parseTimeInput(end);

    if (!validStart) {
      setError(`Invalid start time: "${start}". Use HH:MM:SS or a shortcut like "last-5-min"`);
      return;
    }

    if (!validEnd) {
      setError(`Invalid end time: "${end}". Use HH:MM:SS or "end"`);
      return;
    }

    setTimeFilter(
      typeof validStart === 'string' ? validStart : null,
      typeof validEnd === 'string' ? validEnd : null
    );
    setShowCustom(false);
    setError('');
  };

  const getDisplayText = () => {
    if (!startTime && !endTime) {
      return 'No time filter';
    }
    const startName = startTime ? getTimeDisplayName(startTime) : 'Start';
    const endName = endTime ? getTimeDisplayName(endTime) : 'End';
    return `${startName} to ${endName}`;
  };

  return (
    <div className="time-filter">
      <div className="time-filter-display">
        <label>Time Range:</label>
        <span className="time-filter-text">{getDisplayText()}</span>
      </div>

      <div className="time-filter-shortcuts">
        {SHORTCUTS.map((shortcut) => (
          <button
            key={shortcut.value}
            className={`btn-shortcut ${startTime === shortcut.value ? 'active' : ''}`}
            onClick={() => handleShortcut(shortcut.value)}
          >
            {shortcut.label}
          </button>
        ))}
        <button
          className={`btn-shortcut ${showCustom ? 'active' : ''}`}
          onClick={() => setShowCustom(!showCustom)}
        >
          Custom
        </button>
        {(startTime || endTime) && (
          <button className="btn-shortcut btn-clear" onClick={handleClear}>
            Clear
          </button>
        )}
      </div>

      {showCustom && (
        <div className="time-filter-custom">
          <div className="custom-inputs">
            <div className="input-group">
              <label htmlFor="custom-start">From:</label>
              <input
                id="custom-start"
                type="text"
                placeholder="HH:MM:SS, start, or last-5-min"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomApply();
                }}
              />
            </div>
            <div className="input-group">
              <label htmlFor="custom-end">To:</label>
              <input
                id="custom-end"
                type="text"
                placeholder="HH:MM:SS or end"
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
            <button className="btn-primary" onClick={handleCustomApply}>
              Apply
            </button>
          </div>
          {error && <div className="time-filter-error">{error}</div>}
          <div className="custom-help">
            Examples: <code>12:34:56</code> or <code>12:34:56.123456</code> for absolute times,{' '}
            <code>last-5-min</code>, <code>last-10-min</code>, <code>last-hour</code>,{' '}
            <code>last-day</code> for shortcuts (relative to log end), <code>start</code> / <code>end</code> for log boundaries
          </div>
        </div>
      )}
    </div>
  );
}
