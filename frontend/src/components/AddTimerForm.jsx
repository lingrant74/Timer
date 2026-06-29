import { useState } from 'react';

export default function AddTimerForm({ onAdd, t }) {
  const [name,    setName]    = useState('');
  const [hours,   setHours]   = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

  // Validation error messages shown inline under the fields
  const [nameError, setNameError]         = useState('');
  const [durationError, setDurationError] = useState('');

  // Brief "Added!" confirmation flash
  const [added, setAdded] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();

    // Validate — show errors instead of silently doing nothing
    let valid = true;

    if (!name.trim()) {
      setNameError(t.errorNoName);
      valid = false;
    } else {
      setNameError('');
    }

    const h = parseInt(hours   || '0', 10);
    const m = parseInt(minutes || '0', 10);
    const s = parseInt(seconds || '0', 10);
    const total = h * 3600 + m * 60 + s;

    if (total <= 0) {
      setDurationError(t.errorNoDuration);
      valid = false;
    } else {
      setDurationError('');
    }

    if (!valid) return;

    // Success — reset form, flash confirmation
    onAdd({ name: name.trim(), durationSeconds: total });
    setName('');
    setHours('');
    setMinutes('');
    setSeconds('');
    setNameError('');
    setDurationError('');
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="form-card">
      <h2>{t.formTitle}</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-fields">

          {/* Timer name */}
          <div className="field-group">
            <input
              type="text"
              placeholder={t.namePlaceholder}
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              className={nameError ? 'has-error' : ''}
              maxLength={60}
              autoComplete="off"
              autoCorrect="off"
            />
            {nameError && <p className="field-error">{nameError}</p>}
          </div>

          {/* Duration */}
          <div className="field-group">
            <div className="duration-row">
              <div className="duration-field">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  min="0"
                  max="99"
                  value={hours}
                  onChange={(e) => { setHours(e.target.value); setDurationError(''); }}
                  className={durationError ? 'has-error' : ''}
                  aria-label={t.hr}
                />
                <span>{t.hr}</span>
              </div>
              <div className="duration-field">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => { setMinutes(e.target.value); setDurationError(''); }}
                  className={durationError ? 'has-error' : ''}
                  aria-label={t.min}
                />
                <span>{t.min}</span>
              </div>
              <div className="duration-field">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => { setSeconds(e.target.value); setDurationError(''); }}
                  className={durationError ? 'has-error' : ''}
                  aria-label={t.sec}
                />
                <span>{t.sec}</span>
              </div>
            </div>
            {durationError && <p className="field-error">{durationError}</p>}
          </div>

          {/* Submit */}
          <button type="submit" className={`btn-primary ${added ? 'is-added' : ''}`}>
            {added ? t.timerAdded : t.startTimer}
          </button>

        </div>
      </form>
    </div>
  );
}
