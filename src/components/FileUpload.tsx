import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseLogFile } from '../utils/logParser';
import { useLogStore } from '../stores/logStore';

export function FileUpload() {
  const navigate = useNavigate();
  const setRequests = useLogStore((state) => state.setRequests);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const logContent = e.target?.result as string;
          const { requests, connectionIds, rawLogLines } = parseLogFile(logContent);
          setRequests(requests, connectionIds, rawLogLines);
          navigate('/http_requests/sync');
        } catch (error) {
          console.error('Error parsing log file:', error);
          alert('Error parsing log file. Please make sure it\'s a valid Matrix SDK log file.');
        }
      };

      reader.onerror = () => {
        alert('Error reading file. Please try again.');
      };

      reader.readAsText(file, 'UTF-8');
    },
    [setRequests, navigate]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.classList.remove('dragover');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('dragover');
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    document.getElementById('file-input')?.click();
  }, []);

  return (
    <div
      id="drop-zone"
      className="drop-zone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <div className="drop-zone-content">
        <svg className="drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <h2>Drop Matrix SDK Log File Here</h2>
        <p>or click to browse</p>
        <input
          type="file"
          id="file-input"
          accept=".log,.txt"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
