import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLogStore } from '../stores/logStore';
import { useThemeStore } from '../stores/themeStore';
import styles from './BurgerMenu.module.css';

export function BurgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { clearData, clearLastRoute } = useLogStore();
  const { theme, setTheme } = useThemeStore();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNewSession = () => {
    clearData();
    clearLastRoute();
    void navigate('/');
    setIsOpen(false);
  };

  const handleNavigate = (path: string) => {
    void navigate(path);
    setIsOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={styles.burgerMenu} ref={menuRef}>
      <button
        className={styles.burgerButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        ☰
      </button>
      {isOpen && (
        <div className={styles.burgerDropdown}>
          <button className={styles.burgerItem} onClick={handleNewSession}>
            New Session
          </button>
          <div className={styles.burgerDivider} />
          <div className={styles.burgerSectionTitle}>Views</div>
          <button 
            className={`${styles.burgerItem} ${isActive('/summary') ? styles.active : ''}`}
            onClick={() => handleNavigate('/summary')}
          >
            Summary
          </button>
          <button 
            className={`${styles.burgerItem} ${isActive('/logs') ? styles.active : ''}`}
            onClick={() => handleNavigate('/logs')}
          >
            All Logs
          </button>
          <button 
            className={`${styles.burgerItem} ${isActive('/http_requests') ? styles.active : ''}`}
            onClick={() => handleNavigate('/http_requests')}
          >
            HTTP Requests
          </button>
          <button 
            className={`${styles.burgerItem} ${isActive('/http_requests/sync') ? styles.active : ''}`}
            onClick={() => handleNavigate('/http_requests/sync')}
          >
            Sync Requests
          </button>
          <div className={styles.burgerDivider} />
          <div className={styles.themeButtons}>
            <button 
              className={`${styles.themeButton} ${theme === 'system' ? styles.active : ''}`}
              onClick={() => setTheme('system')}
              data-tooltip="System"
            >
              ◐
            </button>
            <button 
              className={`${styles.themeButton} ${theme === 'light' ? styles.active : ''}`}
              onClick={() => setTheme('light')}
              data-tooltip="Light"
            >
              ☀
            </button>
            <button 
              className={`${styles.themeButton} ${theme === 'dark' ? styles.active : ''}`}
              onClick={() => setTheme('dark')}
              data-tooltip="Dark"
            >
              ☾
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
