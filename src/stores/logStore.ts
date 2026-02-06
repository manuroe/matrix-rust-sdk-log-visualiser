import { create } from 'zustand';
import type { HttpRequest, SyncRequest, ParsedLogLine } from '../types/log.types';
import { calculateTimeRange } from '../utils/timeUtils';
import { wrapError, type AppError } from '../utils/errorHandling';
import { DEFAULT_MS_PER_PIXEL } from '../utils/timelineUtils';

interface LogStore {
  // Sync-specific state
  allRequests: SyncRequest[];
  filteredRequests: SyncRequest[];
  connectionIds: string[];
  selectedConnId: string;
  hidePending: boolean;
  
  // HTTP requests state (all requests, not just sync)
  allHttpRequests: HttpRequest[];
  filteredHttpRequests: HttpRequest[];
  hidePendingHttp: boolean;
  
  // Status code filter (null = all enabled, Set = specific codes enabled)
  // Special value 'Pending' represents requests without a status
  statusCodeFilter: Set<string> | null;
  
  // Global filters (shared across all views)
  startTime: string | null;
  endTime: string | null;
  
  // Timeline scale (shared across waterfall views)
  timelineScale: number;
  
  // UI state
  expandedRows: Set<string>;
  
  // Log display state
  rawLogLines: ParsedLogLine[];
  openLogViewerIds: Set<string>;
  lastRoute: string | null;
  
  // Error state
  error: AppError | null;
  
  // Sync-specific actions
  setRequests: (requests: SyncRequest[], connIds: string[], rawLines: ParsedLogLine[]) => void;
  setSelectedConnId: (connId: string) => void;
  setHidePending: (hide: boolean) => void;
  filterRequests: () => void;
  
  // HTTP requests actions
  setHttpRequests: (requests: HttpRequest[], rawLines: ParsedLogLine[]) => void;
  setHidePendingHttp: (hide: boolean) => void;
  setStatusCodeFilter: (filter: Set<string> | null) => void;
  filterHttpRequests: () => void;
  
  // Global actions
  setTimeFilter: (startTime: string | null, endTime: string | null) => void;
  setTimelineScale: (scale: number) => void;
  toggleRowExpansion: (requestId: string) => void;
  setActiveRequest: (requestId: string) => void; // Opens one request, closes all others
  clearData: () => void;
  
  // Log viewer actions
  openLogViewer: (requestId: string) => void;
  closeLogViewer: (requestId: string) => void;

  // Navigation memory
  setLastRoute: (route: string) => void;
  clearLastRoute: () => void;
  
  // Error handling
  setError: (error: AppError | null) => void;
  clearError: () => void;
  
  // Helper to get displayTime by line number
  getDisplayTime: (lineNumber: number) => string;
}

export const useLogStore = create<LogStore>((set, get) => ({
  // Sync-specific state
  allRequests: [],
  filteredRequests: [],
  connectionIds: [],
  selectedConnId: '',
  hidePending: true,
  
  // HTTP requests state
  allHttpRequests: [],
  filteredHttpRequests: [],
  hidePendingHttp: true,
  
  // Status code filter (null = all enabled)
  statusCodeFilter: null,
  
  // Global filters
  startTime: null,
  endTime: null,
  
  // Timeline scale
  timelineScale: DEFAULT_MS_PER_PIXEL,
  
  // UI state
  expandedRows: new Set(),
  
  rawLogLines: [],
  openLogViewerIds: new Set(),
  lastRoute: null,
  error: null,

  setRequests: (requests, connIds, rawLines) => {
    try {
      const defaultConn = connIds.includes('room-list') ? 'room-list' : connIds[0] || '';
      set({ 
        allRequests: requests, 
        connectionIds: connIds,
        selectedConnId: defaultConn,
        rawLogLines: rawLines,
        error: null
      });
      get().filterRequests();
    } catch (error) {
      const appError = wrapError(error, 'Failed to process log data');
      set({ error: appError });
    }
  },

  setSelectedConnId: (connId) => {
    set({ selectedConnId: connId });
    get().filterRequests();
  },

  setHidePending: (hide) => {
    set({ hidePending: hide });
    get().filterRequests();
  },
  
  setHttpRequests: (requests, rawLines) => {
    set({ 
      allHttpRequests: requests,
      rawLogLines: rawLines
    });
    get().filterHttpRequests();
  },
  
  setHidePendingHttp: (hide) => {
    set({ hidePendingHttp: hide });
    get().filterHttpRequests();
  },
  
  setStatusCodeFilter: (filter) => {
    set({ statusCodeFilter: filter });
    get().filterHttpRequests();
    get().filterRequests();
  },

  setTimeFilter: (startTime, endTime) => {
    set({ startTime, endTime });
    // Re-filter both sync and HTTP requests when time filter changes
    get().filterRequests();
    get().filterHttpRequests();
  },

  setTimelineScale: (scale) => {
    set({ timelineScale: scale });
  },

  toggleRowExpansion: (requestId) => {
    const expandedRows = new Set(get().expandedRows);
    if (expandedRows.has(requestId)) {
      expandedRows.delete(requestId);
    } else {
      expandedRows.add(requestId);
    }
    set({ expandedRows });
  },

  setActiveRequest: (requestId) => {
    // Atomically close all rows and open the new one
    const expandedRows = new Set([requestId]);
    const openLogViewerIds = new Set([requestId]);
    set({ expandedRows, openLogViewerIds });
  },

  filterRequests: () => {
    const { allRequests, rawLogLines, selectedConnId, hidePending, statusCodeFilter, startTime, endTime } = get();
    
    // Calculate time range if filters are set
    let timeRangeMs: { startMs: number; endMs: number } | null = null;
    if (startTime || endTime) {
      // Find max time from rawLogLines to use as reference (end of log)
      const times = rawLogLines.map((l) => l.timestampMs).filter((t) => t > 0);
      const maxLogTimeMs = times.length > 0 ? Math.max(...times) : 0;
      
      // Calculate time range relative to the log's maximum time
      timeRangeMs = calculateTimeRange(startTime, endTime, maxLogTimeMs);
    }
    
    const filtered = allRequests.filter((r) => {
      // Connection filter
      if (selectedConnId && r.connId !== selectedConnId) return false;
      
      // Pending filter
      if (hidePending && !r.status) return false;
      
      // Status code filter (null = all enabled)
      if (statusCodeFilter !== null) {
        const statusKey = r.status || 'Pending';
        if (!statusCodeFilter.has(statusKey)) return false;
      }
      
      // Time filter
      if (timeRangeMs && r.responseLineNumber) {
        const responseLine = rawLogLines.find(l => l.lineNumber === r.responseLineNumber);
        if (responseLine && responseLine.timestampMs) {
          if (responseLine.timestampMs < timeRangeMs.startMs || responseLine.timestampMs > timeRangeMs.endMs) {
            return false;
          }
        }
      }
      
      return true;
    });
    set({ filteredRequests: filtered });
  },
  
  filterHttpRequests: () => {
    const { allHttpRequests, rawLogLines, hidePendingHttp, statusCodeFilter, startTime, endTime } = get();
    
    // Calculate time range if filters are set
    let timeRangeMs: { startMs: number; endMs: number } | null = null;
    if (startTime || endTime) {
      // Find max time from rawLogLines to use as reference (end of log)
      const times = rawLogLines.map((l) => l.timestampMs).filter((t) => t > 0);
      const maxLogTimeMs = times.length > 0 ? Math.max(...times) : 0;
      
      // Calculate time range relative to the log's maximum time
      timeRangeMs = calculateTimeRange(startTime, endTime, maxLogTimeMs);
    }
    
    const filtered = allHttpRequests.filter((r) => {
      // Pending filter
      if (hidePendingHttp && !r.status) return false;
      
      // Status code filter (null = all enabled)
      if (statusCodeFilter !== null) {
        const statusKey = r.status || 'Pending';
        if (!statusCodeFilter.has(statusKey)) return false;
      }
      
      // Time filter
      if (timeRangeMs && r.responseLineNumber) {
        const responseLine = rawLogLines.find(l => l.lineNumber === r.responseLineNumber);
        if (responseLine && responseLine.timestampMs) {
          if (responseLine.timestampMs < timeRangeMs.startMs || responseLine.timestampMs > timeRangeMs.endMs) {
            return false;
          }
        }
      }
      
      return true;
    });
    set({ filteredHttpRequests: filtered });
  },

  clearData: () => {
    set({
      allRequests: [],
      filteredRequests: [],
      connectionIds: [],
      selectedConnId: '',
      allHttpRequests: [],
      filteredHttpRequests: [],
      statusCodeFilter: null,
      startTime: null,
      endTime: null,
      expandedRows: new Set(),
      rawLogLines: [],
      openLogViewerIds: new Set(),
    });
  },
  
  openLogViewer: (requestId) => {
    const current = new Set(get().openLogViewerIds);
    current.add(requestId);
    set({ openLogViewerIds: current });
  },
  
  closeLogViewer: (requestId) => {
    const current = new Set(get().openLogViewerIds);
    current.delete(requestId);
    set({ openLogViewerIds: current });
  },

  setLastRoute: (route) => {
    set({ lastRoute: route });
  },

  clearLastRoute: () => {
    set({ lastRoute: null });
  },
  
  setError: (error) => {
    set({ error });
  },
  
  clearError: () => {
    set({ error: null });
  },
  
  getDisplayTime: (lineNumber) => {
    const { rawLogLines } = get();
    const line = rawLogLines.find(l => l.lineNumber === lineNumber);
    return line?.displayTime || '';
  },
}));
