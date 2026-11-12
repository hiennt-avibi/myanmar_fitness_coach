'use client';
import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTrainingLanguage } from '@/shared/training-language';
import { track } from '@/shared/analytics';
// White is the default; saved system/dark preferences remain available.
export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = 'mingalar-theme';
const NEXT: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
const listeners = new Set<(m: ThemeMode) => void>();
export function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
// Shared by the header toggle and the Me settings row; every mounted control stays in step.
export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>('light');
  useEffect(() => {
    try { setMode((localStorage.getItem(KEY) as ThemeMode) || 'light'); } catch { /* optional */ }
    listeners.add(setMode); return () => { listeners.delete(setMode); };
  }, []);
  useEffect(() => {
    applyTheme(mode);
    if (mode !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)'); const on = () => applyTheme('system');
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, [mode]);
  const cycle = () => {
    const m = NEXT[mode]; listeners.forEach(set => set(m));
    track({ name: 'theme_changed', props: { mode: m } });
    try { localStorage.setItem(KEY, m); } catch { /* optional */ }
  };
  return { mode, cycle };
}
export function ThemeToggle() {
  const tt = useTrainingLanguage(); const { mode, cycle } = useThemeMode();
  const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor;
  return <button type="button" className="icon-button theme-toggle" aria-label={`${tt.themeLabel}: ${tt.themeModes[mode]}`} title={tt.themeModes[mode]} onClick={cycle}><Icon size={20}/></button>;
}
