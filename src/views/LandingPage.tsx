import { FileUpload } from '../components/FileUpload';

export function LandingPage() {
  return (
    <>
      <FileUpload />
      <div className="drop-zone-footer">
        <a href="https://github.com/manuroe/matrix-rust-sdk-log-visualiser" target="_blank" rel="noopener noreferrer">
          View on GitHub
        </a>
      </div>
    </>
  );
}
