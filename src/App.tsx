import { useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { LandingPage } from './views/LandingPage';
import { SyncView } from './views/SyncView';
import { useLogStore } from './stores/logStore';
import { urlToTimeFormat, timeToURLFormat } from './utils/timeUtils';

function AppContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setTimeFilter, startTime, endTime } = useLogStore();
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
  }, []);

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

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/http_requests/sync" element={<SyncView />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
