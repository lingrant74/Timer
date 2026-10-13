import { useState, useEffect } from 'react';
import { getDueStatus } from '../dueWarningSettings';
import { createRecordMedia, deleteRecordMedia, recordMediaUrl } from '../api';

const REMINDER_OPTIONS = {
  en: [
    { value: '', label: 'None' },
    { value: '0m', label: 'At due time' },
    { value: '15m', label: '15 minutes before' },
    { value: '1h', label: '1 hour before' },
    { value: '1d', label: '1 day before' },
    { value: '3d', label: '3 days before' },
    { value: '1w', label: '1 week before' },
    { value: '1mo', label: '1 month before' },
  ],
  zh: [
    { value: '', label: '无' },
    { value: '0m', label: '到期时' },
    { value: '15m', label: '提前15分钟' },
    { value: '1h', label: '提前1小时' },
    { value: '1d', label: '提前1天' },
    { value: '3d', label: '提前3天' },
    { value: '1w', label: '提前1周' },
    { value: '1mo', label: '提前1个月' },
  ],
};

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function getDateTimeInputValues(value) {
  if (!value) return { date: '', time: '' };
  if (!value.includes('T')) return { date: value, time: '23:59' };

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' };

  return {
    date: `${parsed.getFullYear()}-${padDatePart(parsed.getMonth() + 1)}-${padDatePart(parsed.getDate())}`,
    time: `${padDatePart(parsed.getHours())}:${padDatePart(parsed.getMinutes())}`,
  };
}

function toStoredDateTime(date, time) {
  if (!date || !time) return '';
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function getCountdownText(dateStr, t) {
  if (!dateStr) return null;
  // Older records contain only YYYY-MM-DD. Keep treating those as due at the
  // end of the day, while newer values include the time selected by the user.
  const due = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T23:59:59`).getTime();
  if (Number.isNaN(due)) return null;
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

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
}

export default function CellInput({ type, value, onChange, lang, t, placeholder, dueWarningSettings, isPaid = false }) {
  const [showCountdown, setShowCountdown] = useState(false);
  const [, setClockTick] = useState(0);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState('');

  useEffect(() => {
    if (type !== 'date') return undefined;
    const timer = setInterval(() => setClockTick((tick) => tick + 1), 60000);
    return () => clearInterval(timer);
  }, [type]);

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

  if (type === 'tel') {
    return (
      <input
        type="tel"
        inputMode="tel"
        className="cell-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    );
  }

  if (type === 'textarea') {
    return (
      <textarea
        className="cell-input cell-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows="3"
      />
    );
  }

  if (type === 'date') {
    const countdown = value ? getCountdownText(value, t) : null;
    const status = isPaid ? '' : getDueStatus(value, dueWarningSettings);
    const { date: dateValue, time: timeValue } = getDateTimeInputValues(value);

    const handleDateChange = (date) => {
      onChange(date ? toStoredDateTime(date, timeValue || '23:59') : '');
    };

    const handleTimeChange = (time) => {
      if (dateValue && time) onChange(toStoredDateTime(dateValue, time));
    };

    if (showCountdown && countdown) {
      const isOverdue = countdown === t.overdue;
      return (
        <div className={`due-date-cell due-date-${status}`} onClick={() => setShowCountdown(false)}>
          <span className={`countdown-badge ${status || (isOverdue ? 'overdue' : '')}`}>
            {countdown}
          </span>
        </div>
      );
    }
    return (
      <div className={`due-date-cell due-date-${status}`}>
        <div className="date-time-inputs">
          <input
            type="date"
            className="cell-input date-input"
            value={dateValue}
            onChange={(e) => handleDateChange(e.target.value)}
            aria-label={t.dateLabel}
          />
          <input
            type="time"
            className="cell-input time-input"
            value={timeValue}
            onChange={(e) => handleTimeChange(e.target.value)}
            aria-label={t.timeLabel}
            disabled={!dateValue}
          />
        </div>
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
    const options = REMINDER_OPTIONS[lang] || REMINDER_OPTIONS.en;
    return (
      <div className="reminder-cell">
        <select
          className="cell-select"
          value={options.some((option) => option.value === value) ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((option) => (
            <option key={option.value || 'none'} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    );
  }


  if (type === 'image' || type === 'video' || type === 'file') {
    async function handleMedia(event) {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) {
        setMediaError(t.mediaTooLarge);
        return;
      }
      setMediaBusy(true);
      setMediaError('');
      try {
        const data = await readFile(file);
        const saved = await createRecordMedia({ name: file.name, mimeType: file.type || 'application/octet-stream', data });
        if (value?.id) deleteRecordMedia(value.id).catch(() => {});
        onChange(saved);
      } catch {
        setMediaError(t.mediaUploadError);
      } finally {
        setMediaBusy(false);
      }
    }

    async function removeMedia() {
      if (value?.id) await deleteRecordMedia(value.id).catch(() => {});
      onChange('');
    }

    return (
      <div className="media-cell">
        {value?.id ? (
          <div className="media-preview">
            {type === 'image' ? (
              <a href={recordMediaUrl(value.id)} target="_blank" rel="noreferrer">
                <img src={recordMediaUrl(value.id)} alt={value.name || t.mediaImage} />
              </a>
            ) : type === 'video' ? (
              <video src={recordMediaUrl(value.id)} controls preload="metadata" />
            ) : (
              <div className="file-preview">
                <a href={recordMediaUrl(value.id)} target="_blank" rel="noreferrer" download={value.name || true}>
                  <span className="file-icon" aria-hidden="true">↧</span>
                  <span>{t.openFile}</span>
                </a>
                <input
                  type="text"
                  className="file-name-input"
                  value={value.name || ''}
                  onChange={(event) => onChange({ ...value, name: event.target.value })}
                  placeholder={t.fileName}
                  aria-label={t.fileName}
                />
              </div>
            )}
            <button type="button" className="media-remove" onClick={removeMedia} aria-label={t.deleteBtn}>×</button>
          </div>
        ) : (
          <label className="media-upload">
            <input type="file" accept={type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : undefined} onChange={handleMedia} disabled={mediaBusy} />
            <span>{mediaBusy ? t.mediaUploading : type === 'image' ? t.addImage : type === 'video' ? t.addVideo : t.addFile}</span>
          </label>
        )}
        {mediaError && <small className="media-error">{mediaError}</small>}
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
