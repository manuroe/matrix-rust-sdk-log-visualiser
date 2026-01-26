import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './views/LandingPage';
import { SyncView } from './views/SyncView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/http_requests/sync" element={<SyncView />} />
      </Routes>
    </Router>
  );
}

export default App;
