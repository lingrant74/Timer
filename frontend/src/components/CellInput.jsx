import { useState } from 'react';

const REMINDER_PRESETS_EN = ['None', 'Today', 'Tomorrow', '3 days before', '7 days before'];
const REMINDER_PRESETS_ZH = ['无', '今天', '明天', '3天前', '7天前'];

function getCountdownText(dateStr, t) {
  if (!dateStr) return null;
  const due = new Date(dateStr + 'T23:59:59').getTime();
  const now = Date.now();
  const diff = due - now;
  if (diff <= 0) return t.overdue;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return t.countdownDaysHrs(days, hrs);
  if (hrs > 0) return t.countdownHrsMins(hrs, mins);
  return t.countdownMins(mins);
}

export default function CellInput({ type, value, onChange, lang, t, placeholder }) {
  const [showCountdown, setShowCountdown] = useState(false);

  if (type === 'number') {
    return (
      <input
        type="number"
        className="cell-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step="0.01"
        placeholder={placeholder}
      />
    );
  }

  if (type === 'date') {
    const countdown = value ? getCountdownText(value, t) : null;
    if (showCountdown && countdown) {
      const isOverdue = countdown === t.overdue;
      return (
        <div className="due-date-cell" onClick={() => setShowCountdown(false)}>
          <span className={`countdown-badge ${isOverdue ? 'overdue' : ''}`}>
            {countdown}
          </span>
        </div>
      );
    }
    return (
      <div className="due-date-cell">
        <input
          type="date"
          className="cell-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button className="countdown-toggle" onClick={() => setShowCountdown(true)} type="button">
            {t.showCountdown}
          </button>
        )}
      </div>
    );
  }

  if (type === 'checkbox') {
    return (
      <label className="checkbox-cell">
        <input
          type="checkbox"
          checked={value === true || value === 'true'}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  }

  if (type === 'dropdown') {
    return (
      <input
        type="text"
        className="cell-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={`dropdown-${Date.now()}`}
      />
    );
  }

  if (type === 'reminder') {
    const presets = lang === 'zh' ? REMINDER_PRESETS_ZH : REMINDER_PRESETS_EN;
    return (
      <div className="reminder-cell">
        <select
          className="cell-select"
          value={presets.includes(value) ? value : '__custom__'}
          onChange={(e) => {
            if (e.target.value === '__custom__') return;
            onChange(e.target.value);
          }}
        >
          {presets.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
          <option value="__custom__">{lang === 'zh' ? '自定义...' : 'Custom...'}</option>
        </select>
        {!presets.includes(value) && value !== '' && (
          <input
            type="text"
            className="cell-input reminder-custom"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={lang === 'zh' ? '输入自定义提醒' : 'Custom reminder'}
          />
        )}
        {value === '__custom__' || (!presets.includes(value) && value === '') ? (
          <input
            type="text"
            className="cell-input reminder-custom"
            value=""
            onChange={(e) => onChange(e.target.value)}
            placeholder={lang === 'zh' ? '输入自定义提醒' : 'Custom reminder'}
            autoFocus
          />
        ) : null}
      </div>
    );
  }

  // Default: text
  return (
    <input
      type="text"
      className="cell-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
