import { useState } from 'react';

const DURATION_PRESETS = [
  { id: '1d', seconds: 86400, labelKey: 'preset1Day' },
  { id: '2d', seconds: 172800, labelKey: 'preset2Days' },
  { id: '3d', seconds: 259200, labelKey: 'preset3Days' },
  { id: '1w', seconds: 604800, labelKey: 'preset1Week' },
  { id: '1mo', seconds: 2592000, labelKey: 'preset1Month' },
  { id: '3mo', seconds: 7776000, labelKey: 'preset3Months' },
];

export default function AddTimerForm({ onAdd, t }) {
  const [name,    setName]    = useState('');
  const [hours,   setHours]   = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('custom');

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

    const preset = DURATION_PRESETS.find((item) => item.id === selectedPreset);
    const h = parseInt(hours   || '0', 10);
    const m = parseInt(minutes || '0', 10);
    const s = parseInt(seconds || '0', 10);
    const total = preset ? preset.seconds : h * 3600 + m * 60 + s;

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
    setSelectedPreset('custom');
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

          {/* Duration presets */}
          <div className="field-group">
            <span className="field-label">{t.chooseDuration}</span>
            <div className="duration-presets">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-btn ${selectedPreset === preset.id ? 'active' : ''}`}
                  onClick={() => { setSelectedPreset(preset.id); setDurationError(''); }}
                >
                  {t[preset.labelKey]}
                </button>
              ))}
              <button
                type="button"
                className={`preset-btn ${selectedPreset === 'custom' ? 'active' : ''}`}
                onClick={() => { setSelectedPreset('custom'); setDurationError(''); }}
              >
                {t.presetCustom}
              </button>
            </div>
          </div>

          {/* Custom duration */}
          {selectedPreset === 'custom' && (
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
          )}

          {/* Submit */}
          <button type="submit" className={`btn btn-primary form-submit ${added ? 'is-added' : ''}`}>
            {added ? t.timerAdded : t.startTimer}
          </button>

        </div>
      </form>
    </div>
  );
}
