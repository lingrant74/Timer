import { useState, useEffect } from 'react';

function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return '0:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const MODIFIERS = [
  { label: '-1m', seconds: -60 },
  { label: '-10s', seconds: -10 },
  { label: '+10s', seconds: 10 },
  { label: '+1m', seconds: 60 },
];

export default function TimerCard({ timer, onDelete, onModify, t }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, timer.endTime - Math.floor(Date.now() / 1000))
  );

  useEffect(() => {
    const left = Math.max(0, timer.endTime - Math.floor(Date.now() / 1000));
    setRemaining(left);
  }, [timer.endTime]);

  useEffect(() => {
    if (timer.completed || remaining <= 0) return;

    const interval = setInterval(() => {
      const left = Math.max(0, timer.endTime - Math.floor(Date.now() / 1000));
      setRemaining(left);
      if (left === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.endTime, timer.completed]);

  const done = timer.completed || remaining === 0;
  const urgent = !done && remaining <= 30;

  return (
    <div className={`timer-row ${done ? 'is-done' : ''}`}>
      <span className="timer-name">{timer.name}</span>
      {!done && (
        <div className="timer-modifiers">
          {MODIFIERS.map((mod) => (
            <button
              key={mod.label}
              className="btn-mod"
              onClick={() => onModify(timer.id, mod.seconds)}
            >
              {mod.label}
            </button>
          ))}
        </div>
      )}
      <span className={`timer-time ${urgent ? 'urgent' : ''} ${done ? 'done' : ''}`}>
        {done ? t.done : formatTime(remaining)}
      </span>
      <button
        className="btn-delete"
        onClick={() => onDelete(timer.id)}
        aria-label={t.deleteLabel(timer.name)}
      >
        ×
      </button>
    </div>
  );
}
