export default function InstallInstructions({ t }) {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  if (!isIOS || isStandalone) return null;

  return (
    <div className="install-box">
      <p className="install-title">{t.installTitle}</p>
      <ol className="install-steps">
        <li>{t.installStep1} <strong>{t.installStep1b}</strong> {t.installStep1c || ''}</li>
        <li>{t.installStep2} <strong>{t.installStep2b}</strong> {t.installStep2c}</li>
        <li>{t.installStep3} <strong>{t.installStep3b}</strong></li>
        <li>{t.installStep4}</li>
        <li>{t.installStep5} <strong>{t.installStep5b}</strong> {t.installStep5c}</li>
      </ol>
      <p className="install-note">{t.installNote}</p>
    </div>
  );
}
