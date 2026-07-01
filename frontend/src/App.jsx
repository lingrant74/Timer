import { useState } from 'react';
import RecordsPage from './pages/RecordsPage';
import TimersPage from './pages/TimersPage';
import { usePushNotifications } from './usePushNotifications';
import strings from './lang';

export default function App() {
  const [tab, setTab] = useState(() => localStorage.getItem('activeTab') || 'records');
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');

  const t = strings[lang];
  const { subscriptionId } = usePushNotifications();

  function toggleLang() {
    const next = lang === 'en' ? 'zh' : 'en';
    setLang(next);
    localStorage.setItem('lang', next);
  }

  function switchTab(newTab) {
    setTab(newTab);
    localStorage.setItem('activeTab', newTab);
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <button className="btn-lang" onClick={toggleLang}>
          {t.langToggle}
        </button>
      </div>

      <main className="main-content">
        {tab === 'records' ? <RecordsPage t={t} lang={lang} subscriptionId={subscriptionId} /> : <TimersPage t={t} />}
      </main>

      <nav className="tab-bar">
        <button
          className={`tab-btn ${tab === 'records' ? 'active' : ''}`}
          onClick={() => switchTab('records')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span>{t.tabRecords}</span>
        </button>
        <button
          className={`tab-btn ${tab === 'timers' ? 'active' : ''}`}
          onClick={() => switchTab('timers')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>{t.tabTimers}</span>
        </button>
      </nav>
    </div>
  );
}
