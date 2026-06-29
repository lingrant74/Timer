import { useState, useEffect } from 'react';

function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return '0:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerCard({ timer, onDelete, t }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, timer.endTime - Math.floor(Date.now() / 1000))
  );

  useEffect(() => {
    if (timer.completed || remaining <= 0) return;

    const interval = setInterval(() => {
      const left = Math.max(0, timer.endTime - Math.floor(Date.now() / 1000));
      setRemaining(left);
      if (left === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.endTime, timer.completed]);

  const done   = timer.completed || remaining === 0;
  const urgent = !done && remaining <= 30;

  return (
    <div className={`timer-card ${done ? 'is-done' : ''}`}>
      <div className="timer-info">
        <span className="timer-name">{timer.name}</span>
        <span className={`timer-time ${urgent ? 'urgent' : ''} ${done ? 'done' : ''}`}>
          {done ? t.done : formatTime(remaining)}
        </span>
      </div>
      <button
        className="btn-delete"
        onClick={() => onDelete(timer.id)}
        aria-label={t.deleteLabel(timer.name)}
      >
        {t.deleteBtn}
      </button>
    </div>
  );
}
