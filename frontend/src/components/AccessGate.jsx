import { useState } from 'react';

const ACCESS_CODE = '806228';

export default function AccessGate({ t, onUnlock }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  function submit(event) {
    event.preventDefault();
    if (code !== ACCESS_CODE) {
      setError(true);
      setCode('');
      return;
    }
    localStorage.setItem('appAccessGranted', 'true');
    onUnlock();
  }

  return (
    <main className="access-gate">
      <form className="access-card" onSubmit={submit}>
        <div className="access-icon" aria-hidden="true">✓</div>
        <h1>{t.accessTitle}</h1>
        <p>{t.accessDescription}</p>
        <label htmlFor="access-code">{t.accessCodeLabel}</label>
        <input
          id="access-code"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength="6"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
            setError(false);
          }}
          placeholder="••••••"
          autoFocus
        />
        {error && <div className="access-error" role="alert">{t.accessIncorrect}</div>}
        <button type="submit" className="btn btn-primary" disabled={code.length !== 6}>
          {t.accessContinue}
        </button>
      </form>
    </main>
  );
}
