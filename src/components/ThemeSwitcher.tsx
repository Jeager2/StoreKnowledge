import React from 'react';
import { useApp } from '../contexts/AppContext';

interface ThemeSwitcherProps {
  className?: string;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useApp();

  return (
    <div className={`theme-switcher ${className}`}>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={theme === 'dark'}
          onChange={toggleTheme}
        />
        <span className="toggle-slider"></span>
      </label>
      <span className="theme-label">{theme === 'light' ? 'Light' : 'Dark'}</span>
    </div>
  );
};

export default ThemeSwitcher;