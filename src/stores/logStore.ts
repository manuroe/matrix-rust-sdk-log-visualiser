import { create } from 'zustand';
import type { HttpRequest, SyncRequest, ParsedLogLine } from '../types/log.types';
import { isInTimeRange, calculateTimeRange, timeToMs } from '../utils/timeUtils';

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
  
  // Global filters (shared across all views)
  startTime: string | null;
  endTime: string | null;
  
  // UI state
  expandedRows: Set<string>;
  
  // Log display state
  rawLogLines: ParsedLogLine[];
  openLogViewerIds: Set<string>;
  lastRoute: string | null;
  
  // Sync-specific actions
  setRequests: (requests: SyncRequest[], connIds: string[], rawLines: ParsedLogLine[]) => void;
  setSelectedConnId: (connId: string) => void;
  setHidePending: (hide: boolean) => void;
  filterRequests: () => void;
  
  // HTTP requests actions
  setHttpRequests: (requests: HttpRequest[], rawLines: ParsedLogLine[]) => void;
  setHidePendingHttp: (hide: boolean) => void;
  filterHttpRequests: () => void;
  
  // Global actions
  setTimeFilter: (startTime: string | null, endTime: string | null) => void;
  toggleRowExpansion: (requestId: string) => void;
  setActiveRequest: (requestId: string) => void; // Opens one request, closes all others
  clearData: () => void;
  
  // Log viewer actions
  openLogViewer: (requestId: string) => void;
  closeLogViewer: (requestId: string) => void;

  // Navigation memory
  setLastRoute: (route: string) => void;
  clearLastRoute: () => void;
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
  
  // Global filters
  startTime: null,
  endTime: null,
  
  // UI state
  expandedRows: new Set(),
  
  rawLogLines: [],
  openLogViewerIds: new Set(),
  lastRoute: null,

  setRequests: (requests, connIds, rawLines) => {
    const defaultConn = connIds.includes('room-list') ? 'room-list' : connIds[0] || '';
    set({ 
      allRequests: requests, 
      connectionIds: connIds,
      selectedConnId: defaultConn,
      rawLogLines: rawLines
    });
    get().filterRequests();
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

  setTimeFilter: (startTime, endTime) => {
    set({ startTime, endTime });
    // Re-filter both sync and HTTP requests when time filter changes
    get().filterRequests();
    get().filterHttpRequests();
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
    const { allRequests, selectedConnId, hidePending, startTime, endTime } = get();
    
    // Calculate time range if filters are set
    let timeRangeMs: { startMs: number; endMs: number } | null = null;
    if (startTime || endTime) {
      // Find max time from all requests to use as reference (end of log)
      const times = allRequests
        .map((r) => r.response_time)
        .filter((t) => t)
        .map(timeToMs);
      const maxLogTimeMs = times.length > 0 ? Math.max(...times) : 0;
      
      // Calculate time range relative to the log's maximum time
      timeRangeMs = calculateTimeRange(startTime, endTime, maxLogTimeMs);
    }
    
    const filtered = allRequests.filter((r) => {
      // Connection filter
      if (selectedConnId && r.conn_id !== selectedConnId) return false;
      
      // Pending filter
      if (hidePending && !r.status) return false;
      
      // Time filter
      if (timeRangeMs && r.response_time) {
        if (!isInTimeRange(r.response_time, timeRangeMs.startMs, timeRangeMs.endMs)) {
          return false;
        }
      }
      
      return true;
    });
    set({ filteredRequests: filtered });
  },
  
  filterHttpRequests: () => {
    const { allHttpRequests, hidePendingHttp, startTime, endTime } = get();
    
    // Calculate time range if filters are set
    let timeRangeMs: { startMs: number; endMs: number } | null = null;
    if (startTime || endTime) {
      // Find max time from all HTTP requests to use as reference (end of log)
      const times = allHttpRequests
        .map((r) => r.response_time)
        .filter((t) => t)
        .map(timeToMs);
      const maxLogTimeMs = times.length > 0 ? Math.max(...times) : 0;
      
      // Calculate time range relative to the log's maximum time
      timeRangeMs = calculateTimeRange(startTime, endTime, maxLogTimeMs);
    }
    
    const filtered = allHttpRequests.filter((r) => {
      // Pending filter
      if (hidePendingHttp && !r.status) return false;
      
      // Time filter
      if (timeRangeMs && r.response_time) {
        if (!isInTimeRange(r.response_time, timeRangeMs.startMs, timeRangeMs.endMs)) {
          return false;
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
}));
