import { useState, useEffect, useCallback } from 'react';
import { getTimers, createTimer, deleteTimer } from './api';
import { usePushNotifications } from './usePushNotifications';
import TimerCard from './components/TimerCard';
import AddTimerForm from './components/AddTimerForm';
import InstallInstructions from './components/InstallInstructions';
import strings from './lang';

export default function App() {
  const [timers,     setTimers]     = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [lang,       setLang]       = useState(
    () => localStorage.getItem('lang') || 'en'
  );

  const t = strings[lang];

  function toggleLang() {
    const next = lang === 'en' ? 'zh' : 'en';
    setLang(next);
    localStorage.setItem('lang', next);
  }

  const { subscriptionId, enabled, enable, error: pushError } = usePushNotifications();

  // ── Load timers ──────────────────────────────────────────────────────────
  const loadTimers = useCallback(async () => {
    try {
      const data = await getTimers();
      setTimers(data);
      setFetchError(null);
    } catch {
      setFetchError(t.errorBackend);
    }
  }, [t.errorBackend]);

  useEffect(() => {
    loadTimers();
    const id = setInterval(loadTimers, 5000);
    return () => clearInterval(id);
  }, [loadTimers]);

  // ── Actions ──────────────────────────────────────────────────────────────
  async function handleAdd({ name, durationSeconds }) {
    try {
      const timer = await createTimer({ name, durationSeconds, subscriptionId });
      setTimers((prev) => [timer, ...prev]);
    } catch {
      setFetchError(t.errorCreate);
    }
  }

  async function handleDelete(id) {
    await deleteTimer(id);
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }

  const active    = timers.filter((t) => !t.completed);
  const completed = timers.filter((t) =>  t.completed);

  return (
    <div className="app">

      {/* ── Header ── */}
      <div className="header">
        <h1>{t.appTitle}</h1>
        <div className="header-actions">
          <button className="btn-lang" onClick={toggleLang}>
            {t.langToggle}
          </button>
          <button
            className={`btn-notify ${enabled ? 'is-on' : ''}`}
            onClick={enable}
            disabled={enabled}
          >
            {enabled ? t.notificationsOn : t.enableNotifications}
          </button>
        </div>
      </div>

      {/* ── Banners ── */}
      {pushError  && <div className="banner error">{pushError}</div>}
      {fetchError && <div className="banner error">{fetchError}</div>}

      {!enabled && (
        <div className="banner warn">{t.warnNotifications}</div>
      )}

      <InstallInstructions t={t} />

      {/* ── Form — always enabled so multiple timers can be added freely ── */}
      <AddTimerForm onAdd={handleAdd} t={t} />

      {/* ── Active timers ── */}
      <section className="section">
        <h2>{t.active}{active.length > 0 ? ` · ${active.length}` : ''}</h2>
        {active.length === 0
          ? <p className="empty">{t.noActive}</p>
          : <div className="timer-list">
              {active.map((timer) => (
                <TimerCard key={timer.id} timer={timer} onDelete={handleDelete} t={t} />
              ))}
            </div>
        }
      </section>

      {/* ── Completed timers ── */}
      {completed.length > 0 && (
        <section className="section">
          <h2>{t.completed} · {completed.length}</h2>
          <div className="timer-list">
            {completed.map((timer) => (
              <TimerCard key={timer.id} timer={timer} onDelete={handleDelete} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
