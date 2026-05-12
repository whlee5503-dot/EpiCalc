import React from 'react';
import type { Lang } from '../i18n/translations';
import { translations } from '../i18n/translations';
import './Header.css';

interface HeaderProps {
  lang: Lang;
  theme: 'light' | 'dark';
  activeTab: string;
  onLangToggle: () => void;
  onThemeToggle: () => void;
  onTabChange: (tab: string) => void;
}

const CrossIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="12" y="3" width="4" height="22" rx="2" fill="currentColor" />
    <rect x="3" y="12" width="22" height="4" rx="2" fill="currentColor" />
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const Header: React.FC<HeaderProps> = ({
  lang, theme, activeTab, onLangToggle, onThemeToggle, onTabChange
}) => {
  const t = translations[lang];

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="brand-icon">
            <CrossIcon />
          </div>
          <div className="brand-text">
            <span className="brand-name">{t.appName}</span>
            <span className="brand-tagline">{t.appTagline}</span>
          </div>
        </div>

        <nav className="header-nav">
          {(['epi', 'screening', 'sir'] as const).map((tab) => (
            <button
              key={tab}
              className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => onTabChange(tab)}
            >
              {t.nav[tab]}
            </button>
          ))}
        </nav>

        <div className="header-controls">
          <button
            className="control-btn lang-btn"
            onClick={onLangToggle}
            title="Toggle language"
          >
            {lang === 'en' ? '한국어' : 'EN'}
          </button>
          <button
            className="control-btn theme-btn"
            onClick={onThemeToggle}
            title="Toggle theme"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
