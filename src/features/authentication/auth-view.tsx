'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, KeyRound, Link2 } from 'lucide-react';
import { useLanguage } from '@/shared/language';
import { useTrainingLanguage } from '@/shared/training-language';
import { authClient } from '@/shared/auth-client';
import { Mascot } from '../gamification/mascot';

// MingalarFit sign-in flow: Welcome → (Create account | Sign in). One column on every screen size.
type Screen = 'welcome' | 'signin' | 'register';
const EXAMPLE_DAYS = [true, false, true, false, true, false, false];

export function AuthView({ signedIn }: { signedIn: () => Promise<void> }) {
  const { t } = useLanguage(); const w = t.welcome; const tt = useTrainingLanguage();
  const [screen, setScreen] = useState<Screen>('welcome');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [google, setGoogle] = useState(false);
  const [checkingGoogle, setCheckingGoogle] = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const register = screen === 'register';
  useEffect(() => {
    void fetch('/api/auth-options', { cache: 'no-store' }).then(response => response.ok ? response.json() : null)
      .then(options => setGoogle(options?.google === true)).catch(() => setGoogle(false)).finally(() => setCheckingGoogle(false));
    const q = new URLSearchParams(window.location.search);
    // Same email already registered with a password: explain instead of a generic failure (accounts are never linked silently).
    if (q.has('authError')) {
      if (q.get('error') === 'account_not_linked') { setNotLinked(true); setScreen('signin'); try { sessionStorage.setItem('mingalar-link-google', '1'); } catch { /* optional */ } }
      else { setError(t.googleError); setScreen('signin'); }
      window.history.replaceState(null, '', '/');
    }
  }, [t.googleError, t.googleNotLinked]);
  const open = (next: Screen) => { setScreen(next); setError(''); if (next === 'register') setNotLinked(false); };
  async function googleLogin() {
    setBusy(true); setError('');
    try {
      const result = await authClient.signIn.social({ provider: 'google', callbackURL: '/', errorCallbackURL: '/?authError=1' });
      if (result.error) { setError(t.googleError); setBusy(false); }
    } catch { setError(t.googleError); setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const values = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${register ? 'sign-up/email' : 'sign-in/email'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: values.get('email'), password: values.get('password'), ...(register ? { name: values.get('name') } : {}) }) });
      if (!response.ok) { setError(t.error); return; }
      await signedIn();
    } catch { setError(t.error); }
    finally { setBusy(false); }
  }
  const googleButton = <>
    <button type="button" className="button auth-google" onClick={() => void googleLogin()} disabled={busy || checkingGoogle || !google}><span aria-hidden="true" className="google-letter">G</span>{t.googleLogin}</button>
    {!checkingGoogle && !google && <p className="google-hint">{t.googleUnavailable}</p>}
  </>;

  if (screen === 'welcome') return <div className="auth-page auth-welcome">
    <header className="auth-bar"><span className="auth-brand"><span className="auth-brand-mark" aria-hidden="true">M</span>Mingalar Fit</span></header>
    <div className="coach-say"><Mascot state="waving" size={52} label=""/><div className="coach-bubble-text"><small>{w.coachLabel}</small><p>{w.coachLine}</p></div></div>
    <div className="auth-intro"><h1>{w.title}</h1><p>{w.body}</p></div>
    <section className="example-week" aria-label={w.exampleWeek}><small>{w.exampleWeek}</small>
      <ul>{t.weekdaysShort.map((day, k) => <li key={day} className={EXAMPLE_DAYS[k] ? 'on' : ''}><span>{day}</span><strong>{EXAMPLE_DAYS[k] ? w.workout : w.rest}</strong></li>)}</ul>
    </section>
    <div className="auth-actions">
      <button type="button" className="button primary" onClick={() => open('register')}>{w.startEmail}</button>
      {googleButton}
      <p className="auth-switch">{w.haveAccount} <button type="button" className="text-button" onClick={() => open('signin')}>{t.login}</button></p>
    </div>
  </div>;

  return <div className="auth-page auth-form-screen">
    <header className="auth-bar"><button type="button" className="icon-button auth-back" aria-label={tt.ux.back} onClick={() => open('welcome')}><ChevronLeft size={24}/></button></header>
    <div className="auth-intro"><h1>{register ? w.registerTitle : w.signInTitle}</h1><p>{register ? w.registerBody : w.signInBody}</p></div>
    <form onSubmit={submit} className="auth-form">
      {googleButton}
      {notLinked && <div className="link-guide" role="status"><strong>{t.googleNotLinkedTitle}</strong><ol><li><i><KeyRound size={16}/></i>{t.googleStep1}</li><li><i><Link2 size={16}/></i>{t.googleStep2}</li></ol></div>}
      <div className="auth-divider" role="separator">{w.or}</div>
      {register && <label>{t.name}<input name="name" required maxLength={80} autoComplete="name"/></label>}
      <label>{t.email}<input type="email" name="email" required autoComplete="email" maxLength={200} placeholder="you@example.com"/></label>
      <label>{t.password}<input type="password" name="password" required minLength={10} maxLength={128} autoFocus={notLinked} autoComplete={register ? 'new-password' : 'current-password'}/>{register && <small>{t.passwordHint}</small>}</label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="auth-actions">
        <button className="button primary" disabled={busy}>{busy ? t.loading : register ? t.register : t.login}</button>
        <p className="auth-switch">{register ? w.haveAccount : t.needAccount} <button type="button" className="text-button" onClick={() => open(register ? 'signin' : 'register')}>{register ? t.login : t.register}</button></p>
      </div>
    </form>
  </div>;
}
