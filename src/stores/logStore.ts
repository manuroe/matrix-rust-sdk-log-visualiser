import { create } from 'zustand';
import type { SyncRequest } from '../types/log.types';

interface LogStore {
  allRequests: SyncRequest[];
  filteredRequests: SyncRequest[];
  connectionIds: string[];
  selectedConnId: string;
  hidePending: boolean;
  expandedRows: Set<string>;
  
  setRequests: (requests: SyncRequest[], connIds: string[]) => void;
  setSelectedConnId: (connId: string) => void;
  setHidePending: (hide: boolean) => void;
  toggleRowExpansion: (requestId: string) => void;
  filterRequests: () => void;
  clearData: () => void;
}

export const useLogStore = create<LogStore>((set, get) => ({
  allRequests: [],
  filteredRequests: [],
  connectionIds: [],
  selectedConnId: '',
  hidePending: true,
  expandedRows: new Set(),

  setRequests: (requests, connIds) => {
    const defaultConn = connIds.includes('room-list') ? 'room-list' : connIds[0] || '';
    set({ 
      allRequests: requests, 
      connectionIds: connIds,
      selectedConnId: defaultConn 
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
    const { allRequests, selectedConnId, hidePending } = get();
    const filtered = allRequests.filter(
      (r) =>
        (!selectedConnId || r.conn_id === selectedConnId) &&
        (!hidePending || r.status)
    );
    set({ filteredRequests: filtered });
  },

  clearData: () => {
    set({
      allRequests: [],
      filteredRequests: [],
      connectionIds: [],
      selectedConnId: '',
      expandedRows: new Set(),
    });
  },
}));
