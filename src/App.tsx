import { useEffect, useRef } from 'react';
import {
  HashRouter as Router,
  Routes,
  Route,
  useSearchParams,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { LandingPage } from './views/LandingPage';
import { SummaryView } from './views/SummaryView';
import { SyncView } from './views/SyncView';
import { HttpRequestsView } from './views/HttpRequestsView';
import { LogsView } from './views/LogsView';
import { useLogStore } from './stores/logStore';
import { urlToTimeFormat, timeToURLFormat } from './utils/timeUtils';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DEFAULT_MS_PER_PIXEL } from './utils/timelineUtils';

function AppContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    setTimeFilter, 
    startTime, 
    endTime, 
    timelineScale, 
    setTimelineScale, 
    statusCodeFilter,
    setStatusCodeFilter,
    rawLogLines, 
    setLastRoute 
  } = useLogStore();
  const location = useLocation();
  const navigate = useNavigate();
  const prevTimeFilterRef = useRef<{ startTime: string | null; endTime: string | null }>({
    startTime: null,
    endTime: null,
  });
  const prevTimelineScaleRef = useRef<number>(DEFAULT_MS_PER_PIXEL);
  const prevStatusFilterRef = useRef<Set<string> | null>(null);
  const prevPathnameRef = useRef<string>(location.pathname);

  // Initialize time filter, timeline scale, and status filter from URL
  // Also update prev refs so the sync effect doesn't see these as "changes"
  useEffect(() => {
    // Don't initialize filters if there's no data - redirect will handle it
    if (rawLogLines.length === 0) {
      return;
    }

    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const scale = searchParams.get('scale');
    const status = searchParams.get('status');
    
    // Track if this is a navigation (path change) vs just a param update
    const isNavigation = prevPathnameRef.current !== location.pathname;
    prevPathnameRef.current = location.pathname;
    
    // Parse status codes from URL
    const statusCodesFromUrl = status 
      ? new Set(status.split(',').filter(s => s.trim()))
      : null;
    
    // Read current store state fresh (not from closure) to avoid stale comparisons
    // This is critical: we don't want this effect to re-run when store changes,
    // only when URL changes. But we need fresh store state for comparison.
    const currentStatusFilter = useLogStore.getState().statusCodeFilter;
    
    // Check if URL status differs from current store state
    const urlStatusDiffersFromStore = (() => {
      if (statusCodesFromUrl === null && currentStatusFilter === null) return false;
      if (statusCodesFromUrl === null || currentStatusFilter === null) return true;
      if (statusCodesFromUrl.size !== currentStatusFilter.size) return true;
      for (const code of statusCodesFromUrl) {
        if (!currentStatusFilter.has(code)) return true;
      }
      return false;
    })();
    
    if (start || end) {
      const startFormatted = urlToTimeFormat(start);
      const endFormatted = urlToTimeFormat(end);
      setTimeFilter(startFormatted, endFormatted);
      // Update prev ref to prevent sync effect from seeing this as a change
      prevTimeFilterRef.current = { startTime: startFormatted, endTime: endFormatted };
    }
    
    if (scale) {
      const scaleNum = parseInt(scale, 10);
      if (!isNaN(scaleNum) && scaleNum > 0) {
        setTimelineScale(scaleNum);
        prevTimelineScaleRef.current = scaleNum;
      }
    }
    
    // Apply status filter from URL only on navigation or if URL has explicit status param
    if (statusCodesFromUrl && statusCodesFromUrl.size > 0) {
      if (urlStatusDiffersFromStore) {
        setStatusCodeFilter(statusCodesFromUrl);
        prevStatusFilterRef.current = statusCodesFromUrl;
      }
    } else if (isNavigation && currentStatusFilter !== null) {
      // No status param in URL AND this is a navigation - reset to show all
      setStatusCodeFilter(null);
      prevStatusFilterRef.current = null;
    }
  }, [searchParams, rawLogLines.length, location.pathname, setTimeFilter, setTimelineScale, setStatusCodeFilter]);

  // Sync store changes to URL
  useEffect(() => {
    // Check if status filter changed (comparing Set contents)
    const statusFilterChanged = (() => {
      if (prevStatusFilterRef.current === statusCodeFilter) return false;
      if (prevStatusFilterRef.current === null || statusCodeFilter === null) return true;
      if (prevStatusFilterRef.current.size !== statusCodeFilter.size) return true;
      for (const code of statusCodeFilter) {
        if (!prevStatusFilterRef.current.has(code)) return true;
      }
      return false;
    })();

    const hasChanged =
      prevTimeFilterRef.current.startTime !== startTime ||
      prevTimeFilterRef.current.endTime !== endTime ||
      prevTimelineScaleRef.current !== timelineScale ||
      statusFilterChanged;

    if (hasChanged) {
      prevTimeFilterRef.current = { startTime, endTime };
      prevTimelineScaleRef.current = timelineScale;
      prevStatusFilterRef.current = statusCodeFilter;
      const newParams = new URLSearchParams(searchParams);
      const startURL = timeToURLFormat(startTime);
      const endURL = timeToURLFormat(endTime);
      
      if (startURL) {
        newParams.set('start', startURL);
      } else {
        newParams.delete('start');
      }
      if (endURL) {
        newParams.set('end', endURL);
      } else {
        newParams.delete('end');
      }
      
      // Sync timeline scale to URL (only if not default)
      if (timelineScale !== DEFAULT_MS_PER_PIXEL) {
        newParams.set('scale', timelineScale.toString());
      } else {
        newParams.delete('scale');
      }
      
      // Sync status filter to URL (only if filtering specific codes)
      if (statusCodeFilter !== null && statusCodeFilter.size > 0) {
        newParams.set('status', Array.from(statusCodeFilter).join(','));
      } else {
        newParams.delete('status');
      }
      
      setSearchParams(newParams);
    }
  }, [startTime, endTime, timelineScale, statusCodeFilter, searchParams, setSearchParams]);

  useEffect(() => {
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    if (location.pathname !== '/') {
      setLastRoute(fullPath);
    }
  }, [location.pathname, location.search, location.hash, setLastRoute]);

  useEffect(() => {
    const hasData = rawLogLines.length > 0;
    if (!hasData && location.pathname !== '/') {
      void navigate('/', { replace: true });
    }
  }, [rawLogLines.length, location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/summary" element={<SummaryView />} />
      <Route path="/logs" element={<LogsView />} />
      <Route path="/http_requests" element={<HttpRequestsView />} />
      <Route path="/http_requests/sync" element={<SyncView />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
