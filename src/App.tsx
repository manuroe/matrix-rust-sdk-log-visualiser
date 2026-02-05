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

function AppContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setTimeFilter, startTime, endTime, rawLogLines, setLastRoute } = useLogStore();
  const location = useLocation();
  const navigate = useNavigate();
  const prevTimeFilterRef = useRef<{ startTime: string | null; endTime: string | null }>({
    startTime: null,
    endTime: null,
  });

  // Initialize time filter from URL on mount
  useEffect(() => {
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    if (start || end) {
      setTimeFilter(urlToTimeFormat(start), urlToTimeFormat(end));
    }
  }, [searchParams, setTimeFilter]);

  // Sync store changes to URL
  useEffect(() => {
    const hasChanged =
      prevTimeFilterRef.current.startTime !== startTime ||
      prevTimeFilterRef.current.endTime !== endTime;

    if (hasChanged) {
      prevTimeFilterRef.current = { startTime, endTime };
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
      setSearchParams(newParams);
    }
  }, [startTime, endTime, searchParams, setSearchParams]);

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
