import { FileUpload } from '../components/FileUpload';
import styles from '../components/FileUpload.module.css';

export function LandingPage() {
  return (
    <>
      <FileUpload />
      <div className={styles.dropZoneFooter}>
        <a href="https://github.com/manuroe/matrix-rust-sdk-log-visualiser" target="_blank" rel="noopener noreferrer">
          View on GitHub
        </a>
      </div>
    </>
  );
}
