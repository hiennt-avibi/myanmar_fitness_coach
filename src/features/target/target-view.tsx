'use client';
import { useEffect, useState } from 'react';
import { trainingApi } from '@/shared/client';
import { useLanguage } from '@/shared/language';
import { useTrainingLanguage } from '@/shared/training-language';
import { pctColor } from '../plan/plan-view';
import { GameView } from '../gamification/game-view';

type Streak = { current: number; best: number; next: number };
type Board = { today: string; kcalTarget: number; milestones: number[]; streaks: Record<'training' | 'water' | 'meals' | 'photos', Streak>;
  grid: { day: string; waterPct: number; meals: number; photos: number; kcalPct: number; workoutPct: number | null; planned: boolean }[] };
const KINDS = ['training', 'water', 'meals', 'photos'] as const;
// cell colour per streak type: water = blue scale by %, meals = darker the closer to the calorie target, training = % scale
function cell(kind: typeof KINDS[number], d: Board['grid'][number]) {
  if (kind === 'water') return d.waterPct ? `color-mix(in srgb, var(--c-water) ${Math.max(15, d.waterPct)}%, transparent)` : 'var(--line)';
  if (kind === 'meals') return d.meals ? `color-mix(in srgb, var(--c-meal) ${Math.max(18, Math.min(100, 100 - Math.abs(100 - d.kcalPct)))}%, transparent)` : 'var(--line)';
  if (kind === 'photos') return d.photos ? `color-mix(in srgb, var(--c-photo) ${Math.min(100, 35 + d.photos * 25)}%, transparent)` : 'var(--line)';
  return d.workoutPct !== null ? pctColor(d.workoutPct) : d.planned ? 'var(--line)' : 'transparent';
}

export function TargetView() {
  const { t } = useLanguage(); const tt = useTrainingLanguage(); const u = tt.ux; const g = u.goals;
  const [b, setB] = useState<Board | null>(null); const [habit, setHabit] = useState<typeof KINDS[number]>('training');
  useEffect(() => { trainingApi<Board>('streaks').then(setB).catch(() => {}); }, []);
  if (!b) return <section className="target-view"><div className="sk sk-title"/><div className="sk sk-card"/><div className="sk sk-card"/></section>;
  const first = new Date(b.grid[0].day + 'T12:00:00Z').getUTCDay(), offset = (first + 6) % 7;
  const sel = b.streaks[habit];
  return <section className="target-view">
    <div className="page-heading"><h1>{g.tab}</h1><p>{g.intro}</p></div>
    <section className="home-section" aria-labelledby="h-streaks">
      <h2 id="h-streaks">{g.title}</h2><p className="section-note">{u.mf.pickHabit}</p>
      <div className="mf-list">{KINDS.map(k => { const s = b.streaks[k]; return <button key={k} type="button" className={`mf-row streak-row ${habit === k ? 'on' : ''}`} aria-pressed={habit === k} onClick={() => setHabit(k)}>
        <span className="mf-row-text"><strong>{g.names[k]}</strong><small>{g.rules[k]}</small><small className="row-strong">{g.best} {s.best} · {s.current >= s.next ? g.reached : g.toNext.replace('{n}', String(s.next - s.current)).replace('{m}', String(s.next))}</small></span>
        <span className="streak-count"><strong>{s.current}</strong><small>{g.days}</small></span></button>; })}</div>
    </section>
    <section className="mf-card habit-calendar" aria-labelledby="h-habit-cal">
      <div className="mf-head"><h3 id="h-habit-cal">{g.names[habit]}</h3><span>{sel.current} {g.days}</span></div>
      <div className="milestone-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.round(sel.current / sel.next * 100))}%` }}/></div>
      <div className="sg-legend">{t.weekdaysShort.map(w => <small key={w}>{w.slice(0, 2)}</small>)}</div>
      <div className="streak-grid" role="img" aria-label={`${g.names[habit]}: 5 ${g.weeks}`}>
        {Array.from({ length: offset }, (_, i) => <span key={`x${i}`} className="sg-empty"/>)}
        {b.grid.map(d => <span key={d.day} title={`${d.day}`} className={d.day === b.today ? 'today' : ''} style={{ background: cell(habit, d) }}>{habit === 'water' && d.waterPct >= 100 ? '✓' : ''}</span>)}
      </div>
    </section>
    <section className="mf-card ladder"><h3>{g.ladder}</h3>
      {KINDS.map(k => <div key={k} className="ladder-row"><small>{g.names[k]}</small>
        <div className="ladder-steps">{b.milestones.slice(0, 5).map(m => <span key={m} className={b.streaks[k].best >= m || b.streaks[k].current >= m ? 'won' : ''}>{m}</span>)}</div></div>)}
      <p className="section-note">{g.ladderHint}</p></section>
    <GameView screen="home" embedded/>
  </section>;
}
