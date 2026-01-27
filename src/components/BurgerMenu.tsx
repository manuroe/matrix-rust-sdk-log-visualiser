import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogStore } from '../stores/logStore';

export function BurgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { clearData } = useLogStore();

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
    navigate('/');
    setIsOpen(false);
  };

  return (
    <div className="burger-menu" ref={menuRef}>
      <button
        className="burger-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        ☰
      </button>
      {isOpen && (
        <div className="burger-dropdown">
          <button className="burger-item" onClick={handleNewSession}>
            New Session
          </button>
          <div className="burger-divider" />
          <div className="burger-section-title">Views</div>
          <button className="burger-item active">
            /sync requests
          </button>
        </div>
      )}
    </div>
  );
}
