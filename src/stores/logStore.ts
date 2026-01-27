import { create } from 'zustand';
import type { SyncRequest, ParsedLogLine } from '../types/log.types';
import { isInTimeRange, calculateTimeRange, timeToMs } from '../utils/timeUtils';

interface LogStore {
  allRequests: SyncRequest[];
  filteredRequests: SyncRequest[];
  connectionIds: string[];
  selectedConnId: string;
  hidePending: boolean;
  startTime: string | null;
  endTime: string | null;
  expandedRows: Set<string>;
  
  // Log display state
  rawLogLines: ParsedLogLine[];
  openLogViewerIds: Set<string>;
  
  setRequests: (requests: SyncRequest[], connIds: string[], rawLines: ParsedLogLine[]) => void;
  setSelectedConnId: (connId: string) => void;
  setHidePending: (hide: boolean) => void;
  setTimeFilter: (startTime: string | null, endTime: string | null) => void;
  toggleRowExpansion: (requestId: string) => void;
  filterRequests: () => void;
  clearData: () => void;
  
  // Log viewer actions
  openLogViewer: (requestId: string) => void;
  closeLogViewer: (requestId: string) => void;
}

export const useLogStore = create<LogStore>((set, get) => ({
  allRequests: [],
  filteredRequests: [],
  connectionIds: [],
  selectedConnId: '',
  hidePending: true,
  startTime: null,
  endTime: null,
  expandedRows: new Set(),
  
  rawLogLines: [],
  openLogViewerIds: new Set(),

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

  setTimeFilter: (startTime, endTime) => {
    set({ startTime, endTime });
    get().filterRequests();
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

  clearData: () => {
    set({
      allRequests: [],
      filteredRequests: [],
      connectionIds: [],
      selectedConnId: '',
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
}));
