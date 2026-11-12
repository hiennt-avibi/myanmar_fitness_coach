'use client';
import { track } from '@/shared/analytics';
import { api } from '@/shared/client';
import { useLanguage } from '@/shared/language';

// Each language is named in its own script so it can be found whichever one is showing.
export const languageName = (locale: string) => (locale === 'en' ? 'English' : 'မြန်မာ');

// Explicit Myanmar ⇄ English switch; signed-in users also save it to their preferences.
export function useToggleLanguage(saveToProfile: boolean) {
  const { locale, setLocale } = useLanguage();
  return () => {
    const next = locale === 'en' ? 'my-MM' : 'en';
    setLocale(next); track({ name: 'language_switched', props: { to: next } });
    if (saveToProfile) void api('preferences', { locale: next }).catch(() => {});
  };
}

export function LanguageSwitch({ saveToProfile }: { saveToProfile: boolean }) {
  const { locale } = useLanguage(); const toggle = useToggleLanguage(saveToProfile);
  return <button type="button" className="language-switch" onClick={toggle} aria-label="Language">{languageName(locale === 'en' ? 'my-MM' : 'en')}</button>;
}
