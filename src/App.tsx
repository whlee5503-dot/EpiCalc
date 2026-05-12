import { useState, useEffect } from 'react';
import Header from './components/Header';
import EpiCalculator from './components/EpiCalculator';
import ScreeningCalc from './components/ScreeningCalc';
import SIRSimulator from './components/SIRSimulator/SIRSimulator';
import type { Lang } from './i18n/translations';
import './styles/variables.css';
import './App.css';

type Tab = 'epi' | 'screening' | 'sir';
type Theme = 'light' | 'dark';

function App() {
  const [tab, setTab] = useState<Tab>('epi');
  const [lang, setLang] = useState<Lang>('en');
  const [theme, setTheme] = useState<Theme>('light');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Persist preferences
  useEffect(() => {
    const saved = localStorage.getItem('epicalc-prefs');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        if (prefs.lang) setLang(prefs.lang);
        if (prefs.theme) setTheme(prefs.theme);
      } catch { /* ignore */ }
    }
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'ko' : 'en';
    setLang(next);
    localStorage.setItem('epicalc-prefs', JSON.stringify({ lang: next, theme }));
  };

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('epicalc-prefs', JSON.stringify({ lang, theme: next }));
  };

  return (
    <div className="app-root">
      <Header
        lang={lang}
        theme={theme}
        activeTab={tab}
        onLangToggle={toggleLang}
        onThemeToggle={toggleTheme}
        onTabChange={(t) => setTab(t as Tab)}
      />
      <main className="app-main">
        {tab === 'epi' && <EpiCalculator lang={lang} />}
        {tab === 'screening' && <ScreeningCalc lang={lang} />}
        {tab === 'sir' && <SIRSimulator lang={lang} />}
      </main>
      <footer className="app-footer">
        <div className="footer-inner">
          <span>EpiCalc © {new Date().getFullYear()}</span>
          <span className="footer-sep">·</span>
          <span>Public Health Calculator</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
