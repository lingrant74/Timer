export default function SettingsPage({ t, settings, onChange }) {
  function update(key, value) {
    const number = Math.max(0, Number(value) || 0);
    onChange({ ...settings, [key]: number });
  }

  return (
    <div className="page settings-page">
      <header className="page-header">
        <h1>{t.settingsTitle}</h1>
      </header>

      <section className="settings-card">
        <h2>{t.dueColorTitle}</h2>
        <p className="settings-description">{t.dueColorDescription}</p>

        <label className="settings-field settings-soon">
          <span>{t.lightRedStarts}</span>
          <div><input type="number" min="0" value={settings.soonDays} onChange={(e) => update('soonDays', e.target.value)} /> {t.daysBefore}</div>
        </label>
        <label className="settings-field settings-urgent">
          <span>{t.mediumRedStarts}</span>
          <div><input type="number" min="0" value={settings.urgentDays} onChange={(e) => update('urgentDays', e.target.value)} /> {t.daysBefore}</div>
        </label>
        <label className="settings-field settings-critical">
          <span>{t.strongRedStarts}</span>
          <div><input type="number" min="0" value={settings.criticalHours} onChange={(e) => update('criticalHours', e.target.value)} /> {t.hoursBefore}</div>
        </label>

        <div className="warning-preview" aria-label={t.colorPreview}>
          <span className="preview-normal">{t.normal}</span>
          <span className="preview-soon">{t.soon}</span>
          <span className="preview-urgent">{t.urgent}</span>
          <span className="preview-critical">{t.critical}</span>
        </div>
      </section>
    </div>
  );
}
