import { FileUpload } from '../components/FileUpload';
import styles from '../components/FileUpload.module.css';

export function LandingPage() {
  const prNumber = import.meta.env.VITE_PR_NUMBER;
  const githubUrl = prNumber 
    ? `https://github.com/manuroe/matrix-rust-sdk-log-visualiser/pull/${prNumber}`
    : 'https://github.com/manuroe/matrix-rust-sdk-log-visualiser';
  
  return (
    <>
      <FileUpload />
      <div className={styles.dropZoneFooter}>
        <a href={githubUrl} target="_blank" rel="noopener noreferrer">
          View on GitHub
        </a>
      </div>
    </>
  );
}
