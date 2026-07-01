import { useState, useEffect, useCallback } from 'react';
import { getTimers, createTimer, deleteTimer, modifyTimer } from '../api';
import { usePushNotifications } from '../usePushNotifications';
import TimerCard from '../components/TimerCard';
import AddTimerForm from '../components/AddTimerForm';
import InstallInstructions from '../components/InstallInstructions';

export default function TimersPage({ t }) {
  const [timers, setTimers] = useState([]);
  const [fetchError, setFetchError] = useState(null);

  const { subscriptionId, enabled, enable, error: pushError } = usePushNotifications();

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

  async function handleAdd({ name, durationSeconds }) {
    try {
      const timer = await createTimer({ name, durationSeconds, subscriptionId });
      setTimers((prev) => [timer, ...prev]);
    } catch {
      setFetchError(t.errorCreate);
    }
  }

  async function handleModify(id, adjustSeconds) {
    try {
      const updated = await modifyTimer(id, adjustSeconds);
      setTimers((prev) => prev.map((tm) => (tm.id === id ? updated : tm)));
    } catch {
      setFetchError(t.errorCreate);
    }
  }

  async function handleDelete(id) {
    await deleteTimer(id);
    setTimers((prev) => prev.filter((tm) => tm.id !== id));
  }

  const active = timers.filter((tm) => !tm.completed);
  const completed = timers.filter((tm) => tm.completed);

  return (
    <div className="page timers-page">
      <header className="page-header">
        <h1>{t.appTitle}</h1>
        <button
          className={`btn btn-notify ${enabled ? 'is-on' : ''}`}
          onClick={enable}
          disabled={enabled}
        >
          {enabled ? t.notificationsOn : t.enableNotifications}
        </button>
      </header>

      {pushError && <div className="banner error">{pushError}</div>}
      {fetchError && <div className="banner error">{fetchError}</div>}
      {!enabled && <div className="banner warn">{t.warnNotifications}</div>}

      <InstallInstructions t={t} />
      <AddTimerForm onAdd={handleAdd} t={t} />

      <section className="section">
        <h2>{t.active}{active.length > 0 ? ` · ${active.length}` : ''}</h2>
        {active.length === 0 ? (
          <p className="empty-text">{t.noActive}</p>
        ) : (
          <div className="timer-list">
            {active.map((timer) => (
              <TimerCard key={timer.id} timer={timer} onDelete={handleDelete} onModify={handleModify} t={t} />
            ))}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section className="section">
          <h2>{t.completed} · {completed.length}</h2>
          <div className="timer-list">
            {completed.map((timer) => (
              <TimerCard key={timer.id} timer={timer} onDelete={handleDelete} onModify={handleModify} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
