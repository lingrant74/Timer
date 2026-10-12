import { useState } from 'react';
import RecordsPage from './pages/RecordsPage';
import TimersPage from './pages/TimersPage';
import SettingsPage from './pages/SettingsPage';
import { usePushNotifications } from './usePushNotifications';
import { loadDueWarningSettings } from './dueWarningSettings';
import strings from './lang';

export default function App() {
  const [tab, setTab] = useState(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (requestedTab === 'records' || requestedTab === 'timers' || requestedTab === 'settings') return requestedTab;
    return localStorage.getItem('activeTab') || 'records';
  });
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');
  const [dueWarningSettings, setDueWarningSettings] = useState(loadDueWarningSettings);

  const t = strings[lang];
  const {
    subscriptionId,
    enabled: notificationsEnabled,
    enable: enableNotifications,
    error: pushError,
  } = usePushNotifications();

  function toggleLang() {
    const next = lang === 'en' ? 'zh' : 'en';
    setLang(next);
    localStorage.setItem('lang', next);
  }

  function switchTab(newTab) {
    setTab(newTab);
    localStorage.setItem('activeTab', newTab);
  }

  function updateDueWarningSettings(next) {
    setDueWarningSettings(next);
    localStorage.setItem('dueWarningSettings', JSON.stringify(next));
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <button className="btn-lang" onClick={toggleLang}>
          {t.langToggle}
        </button>
      </div>

      <main className="main-content">
        {tab === 'records' ? (
          <RecordsPage
            t={t}
            lang={lang}
            subscriptionId={subscriptionId}
            notificationsEnabled={notificationsEnabled}
            enableNotifications={enableNotifications}
            pushError={pushError}
            dueWarningSettings={dueWarningSettings}
          />
        ) : tab === 'timers' ? (
          <TimersPage t={t} />
        ) : (
          <SettingsPage t={t} settings={dueWarningSettings} onChange={updateDueWarningSettings} />
        )}
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
        <button
          className={`tab-btn ${tab === 'settings' ? 'active' : ''}`}
          onClick={() => switchTab('settings')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1H3v-4h.08A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88L4.2 7.03 7.03 4.2l.06.06A1.7 1.7 0 0 0 8.97 4.6 1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15z"/>
          </svg>
          <span>{t.tabSettings}</span>
        </button>
      </nav>
    </div>
  );
}
