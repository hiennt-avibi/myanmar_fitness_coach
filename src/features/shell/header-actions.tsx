'use client';
import { Bell } from 'lucide-react';
import { useApp } from '@/shared/app-context';
import { useLanguage } from '@/shared/language';
import { useGameLanguage } from '@/shared/game-language';
import { ThemeToggle } from '@/shared/theme';

// Round 44px header controls from the MingalarFit design: appearance, inbox, profile.
export function HeaderActions() {
  const { data, go } = useApp(); const { t } = useLanguage(); const gameText = useGameLanguage();
  return <div className="header-actions">
    <ThemeToggle/>
    <button type="button" className="icon-button" aria-label={gameText.inbox} onClick={() => go('inbox')}><Bell size={20}/></button>
    <button type="button" className="avatar" aria-label={t.profile} onClick={() => go('profile')}>{data.user.name.slice(0, 1).toUpperCase()}</button>
  </div>;
}
