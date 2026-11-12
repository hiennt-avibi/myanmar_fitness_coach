'use client';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '@/shared/language';
import { languageName, useToggleLanguage } from '@/shared/language-switch';
import { useThemeMode } from '@/shared/theme';
import { useApp } from '@/shared/app-context';
import { useTrainingLanguage } from '@/shared/training-language';
import { bmiBand, bmiOf } from '@/shared/plan';

// "Me": body numbers, shortcuts to progress / coach / inbox / profile, quick settings, sign out. Streaks, XP and badges live in Goals.
export function MeView() {
  const { data, go, refresh } = useApp(); const tt = useTrainingLanguage(); const u = tt.ux;
  const { t, locale } = useLanguage(); const toggleLanguage = useToggleLanguage(true); const theme = useThemeMode();
  const w = data.measurements[0]?.weightKg ?? null; const h = (data.profile as { heightCm?: number | null } | null)?.heightCm ?? null;
  const bmi = bmiOf(w, h), band = bmiBand(bmi);
  const signOut = async () => { await fetch('/api/auth/sign-out', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); await refresh(); };
  const rows: [string, string, () => void][] = [[u.progress, u.progressHint, () => go('progress')], [u.coach, u.coachHint, () => go('coach')], [u.inbox, u.inboxHint, () => go('inbox')], [u.settings, u.settingsHint, () => go('profile')]];
  return <section className="me-view">
    <header className="me-head"><span className="me-avatar" aria-hidden="true">{data.user.name.slice(0, 1).toUpperCase()}</span><div><h1>{data.user.name}</h1><small className="muted">{u.meSince.replace('{n}', String(data.stats.completed))}</small></div></header>
    <div className="me-stats">
      <div className="stat-tile"><strong>{data.stats.completed}</strong><small>{u.workouts}</small></div>
      <div className="stat-tile"><strong>{w ? `${Number(w.toFixed(1))}` : '—'}</strong><small>{u.weightKg}</small></div>
      <div className={`stat-tile bmi-${band ?? 'none'}`}><strong>{bmi ?? '—'}</strong><small>BMI{band ? ` · ${tt.quiz.bmiBands[band]}` : ''}</small></div>
    </div>
    <div className="mf-list">{rows.map(([title, hint, act]) => <button key={title} type="button" className="mf-row" onClick={act}><span className="mf-row-text"><strong>{title}</strong><small>{hint}</small></span><ChevronRight size={18} aria-hidden="true"/></button>)}</div>
    <section className="home-section" aria-labelledby="h-me-settings">
      <h2 id="h-me-settings">{u.mf.settings}</h2>
      <div className="mf-list settings-list">
        <button type="button" className="mf-row" onClick={toggleLanguage}><span className="mf-row-text"><strong>{t.language}</strong></span><small lang={locale === 'en' ? 'en' : 'my'}>{languageName(locale)}</small><ChevronRight size={18} aria-hidden="true"/></button>
        <button type="button" className="mf-row" onClick={theme.cycle}><span className="mf-row-text"><strong>{tt.themeLabel}</strong></span><small>{tt.themeModes[theme.mode]}</small><ChevronRight size={18} aria-hidden="true"/></button>
      </div>
    </section>
    <div className="mf-list"><button type="button" className="mf-row" onClick={() => void signOut()}><span className="mf-row-text"><strong>{t.logout}</strong></span></button></div>
  </section>;
}
