import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { parseLogFile, parseAllHttpRequests } from '../utils/logParser';
import { useLogStore } from '../stores/logStore';
import { wrapError } from '../utils/errorHandling';
import type { AppError } from '../utils/errorHandling';
import ErrorDisplay from '../components/ErrorDisplay';
import uploadStyles from '../components/FileUpload.module.css';

export function LandingPage() {
  const navigate = useNavigate();
  const setRequests = useLogStore((state) => state.setRequests);
  const setHttpRequests = useLogStore((state) => state.setHttpRequests);
  const [demoError, setDemoError] = useState<AppError | null>(null);

  const prNumber = import.meta.env.VITE_PR_NUMBER;
  const githubUrl = prNumber
    ? `https://github.com/manuroe/matrix-rust-sdk-log-visualiser/pull/${prNumber}`
    : 'https://github.com/manuroe/matrix-rust-sdk-log-visualiser';

  const handleLoadDemo = async (e: React.MouseEvent) => {
    e.preventDefault();
    setDemoError(null);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}demo/demo.log`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const content = await response.text();
      const { requests, connectionIds, rawLogLines } = parseLogFile(content);
      const { httpRequests } = parseAllHttpRequests(content);
      setRequests(requests, connectionIds, rawLogLines);
      setHttpRequests(httpRequests, rawLogLines);
      void navigate('/summary');
    } catch (error) {
      setDemoError(wrapError(error, 'Failed to load demo. Please try again.'));
    }
  };

  return (
    <>
      <FileUpload />
      <ErrorDisplay
        error={demoError}
        onDismiss={() => setDemoError(null)}
        className={uploadStyles.dropZoneError}
      />
      <div className={uploadStyles.dropZoneFooter}>
        <a href="#" onClick={(e) => { void handleLoadDemo(e); }}>
          Try with demo logs
        </a>
        {' · '}
        <a href={githubUrl} target="_blank" rel="noopener noreferrer">
          View on GitHub
        </a>
      </div>
    </>
  );
}
