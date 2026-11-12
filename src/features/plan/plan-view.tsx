'use client';
import { useEffect, useState } from 'react';
import { ArrowLeftRight, Camera, Check, ChevronDown, ChevronRight, Clock, Droplets, Dumbbell, Flame, Home, ListPlus, MessageCircle, Play, Repeat, Timer, TrendingDown, TrendingUp, Undo2, Utensils, X } from 'lucide-react';
import { useApp } from '@/shared/app-context';
import { localExercise, trainingApi } from '@/shared/client';
import { useLanguage } from '@/shared/language';
import { useTrainingLanguage } from '@/shared/training-language';
import type { Exercise } from '@/shared/types';
import { groupOf, placeOf, type BalanceIssue, type PlanDay, type PlanItem, type ProgramKey, type StepStage } from '@/shared/plan';
import { Modal } from '@/shared/ui';
import { Button } from '@/components/ui/button';
import { trainingErrorText } from '../training/training-hub';
import { AdaptiveControls } from './adaptive-controls';
import type { assessTraining } from '@/shared/adaptation';
import { RatingPrompt } from '../gamification/rating-prompt';
import { BeeMessage, Mascot } from '../gamification/mascot';
import { HeaderActions } from '../shell/header-actions';

export type PlanDayView = PlanDay & { kcal: number; done: boolean; pct: number | null; doneOn: string | null; thumb: string | null };
export type Plan = { adaptive?: { decision: ReturnType<typeof assessTraining> }; program: ProgramKey; location: 'home' | 'gym'; bmi: number | null; band: string | null; week: number; step: number; stage: StepStage; deload: boolean;
  lastChange: { week: number; avg: number; change: 'up' | 'same' | 'down' } | null; lastAdapt: { change: 'up' | 'same' | 'down'; reason: string; pct: number | null } | null; tired: boolean; pastWeeks: { week: number; done: number; avg: number }[]; sessionMinutes: number; nickname: string;
  current: number | null; completed: number; total: number; days: PlanDayView[]; balance?: { plan: BalanceIssue[]; done: BalanceIssue[] } };
type Scores = { today: string; days: { day: string; score: number | null; workout: number | null; water: number | null; food: number | null; rest: boolean }[] };
const LOC = 'mingalar-location';
export const getLocation = (): 'home' | 'gym' => { try { return localStorage.getItem(LOC) === 'gym' ? 'gym' : 'home'; } catch { return 'home'; } };
// % colour scale: light green (good) → yellow → red; grey when there is no data yet.
export const pctColor = (p: number | null | undefined) => (p === null || p === undefined ? 'var(--line)' : p >= 100 ? 'var(--st-great)' : p >= 80 ? 'var(--st-good)' : p >= 50 ? 'var(--st-warn)' : 'var(--st-low)');

export async function startPlanDay(day: PlanDayView, program: ProgramKey, title: string) {
  return trainingApi<{ id: string }>('free', { name: title.slice(0, 100), program: { key: program, day: day.day },
    exercises: day.items.map(i => ({ exerciseId: i.id, sets: i.sets, reps: i.target, restSeconds: Math.max(10, i.rest), targetKg: i.weightKg ?? 0, timed: i.unit === 'seconds' })) });
}

export function PlanView() {
  const { data, openWorkout, notify, go, openTrain } = useApp(); const { t, locale } = useLanguage(); const tt = useTrainingLanguage(); const u = tt.ux;
  const [plan, setPlan] = useState<Plan | null>(null); const [scores, setScores] = useState<Scores | null>(null); const [library, setLibrary] = useState<Exercise[]>([]); const [error, setError] = useState('');
  const [location, setLocation] = useState<'home' | 'gym'>('home'); const [open, setOpen] = useState<PlanDayView | null>(null); const [programs, setPrograms] = useState(false);
  const [busy, setBusy] = useState(false); const [history, setHistory] = useState(false); const [swapFor, setSwapFor] = useState<PlanItem | null>(null); const [quick, setQuick] = useState(false);
  const load = (loc = location) => trainingApi<Plan>(`plan?location=${loc}`).then(p => { setPlan(p); setError(''); }).catch(e => setError(trainingErrorText(e, t, tt)));
  useEffect(() => { const loc = getLocation(); setLocation(loc); void load(loc); trainingApi<Exercise[]>('exercises').then(setLibrary).catch(() => {}); trainingApi<Scores>('day-scores').then(setScores).catch(() => {}); }, []);
  const ex = (id: string) => library.find(e => e.id === id);
  const name = (id: string) => { const e = ex(id); return e ? localExercise(e, locale).name.split('—')[0].trim() : id; };
  const dayTitle = (d: PlanDayView) => u.splits[d.split as keyof typeof u.splits] ?? d.split;
  async function start(d: PlanDayView) {
    if (data.activeSession) { openWorkout(data.activeSession.id); return; }
    if (!d.items.length) { notify(tt.adaptive.noMatch); return; }
    setBusy(true);
    try { const s = await startPlanDay(d, plan!.program, `${u.day} ${d.day} · ${dayTitle(d)}`); openWorkout(s.id); }
    catch (e) { notify(trainingErrorText(e, t, tt)); } finally { setBusy(false); }
  }
  async function changeProgram(p: ProgramKey) { await trainingApi('program', { program: p }); setPrograms(false); await load(); }
  function switchLocation(l: 'home' | 'gym') { setLocation(l); try { localStorage.setItem(LOC, l); } catch { /* optional */ } void load(l); }
  async function swap(item: PlanItem, to: string | null) {
    if (!open) return; setBusy(true);
    try { const p = await trainingApi<Plan>('plan/swap', { from: item.swappedFrom ?? item.id, to, location }); setPlan(p); setOpen(p.days.find(d => d.day === open.day) ?? null); setSwapFor(null); notify(u.swapSaved); }
    catch (e) { notify(trainingErrorText(e, t, tt)); } finally { setBusy(false); }
  }
  const alternatives = (item: PlanItem) => { const cur = ex(item.id), g = cur ? groupOf(cur) : null;
    return library.filter(e => e.id !== item.id && !open?.items.some(i => i.id === e.id) && g && groupOf(e) === g && (location === 'gym' || placeOf(e) === 'home'))
      .sort((a, b) => Number(!!b.videoUrl) - Number(!!a.videoUrl)).slice(0, 8); };
  const goPlan = (l: 'home' | 'gym') => { if (l !== location) switchLocation(l); requestAnimationFrame(() => document.getElementById('my-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  if (error) return <section className="plan-view"><p className="error-text" role="alert">{error}</p></section>;
  if (!plan) return <section className="plan-view"><div className="sk sk-title"/><div className="sk sk-hero"/><div className="sk sk-card"/></section>;
  const today = plan.days.find(d => d.day === plan.current) ?? null;
  const todayScore = scores?.days.at(-1);
  const recordedScores = scores?.days.filter(d => d.score !== null) ?? [];
  const weeklyAverage = recordedScores.length ? Math.round(recordedScores.reduce((n, d) => n + d.score!, 0) / recordedScores.length) : null;
  const who = plan.nickname || data.user.name.split(' ')[0];
  const todayDone = plan.days.some(d => d.doneOn && new Date(d.doneOn).toDateString() === new Date().toDateString());
  const fill = (x: string, v: Record<string, string | number> = {}) => Object.entries(v).reduce((r, [k, val]) => r.replaceAll(`{${k}}`, String(val)), x);
  const issueText = (i: BalanceIssue) => fill(tt.insights[i.code as keyof typeof tt.insights] ?? i.code, i.values ?? {});
  const warnings = [...(plan.balance?.done ?? []).map(issueText), ...(plan.balance?.plan ?? []).filter(i => !plan.balance?.done.some(d => d.code === i.code)).map(i => `${u.coachPlanWarn} ${issueText(i)}`)].slice(0, 2);
  const m = u.mf;
  const openFood = () => { try { sessionStorage.setItem('mingalar-tab', 'food'); } catch { /* optional */ } go('water'); };
  const workoutPct = todayDone ? 100 : todayScore?.workout ?? null;
  const parts: { key: string; label: string; pct: number | null; status: string; action: string | null; act: () => void }[] = [
    { key: 'workout', label: u.partWorkout, pct: workoutPct, status: today ? `${todayDone ? m.doneToday : workoutPct ? fill(m.ofGoal, { pct: workoutPct }) : m.notStarted} · ${today.minutes} ${u.min}` : m.doneToday,
      action: today && !todayDone ? (data.activeSession ? u.resume : u.start) : null, act: () => { if (today) void start(today); } },
    { key: 'water', label: u.partWater, pct: todayScore?.water ?? null, status: fill(m.ofGoal, { pct: todayScore?.water ?? 0 }), action: m.addWater, act: () => go('water') },
    { key: 'food', label: u.partFood, pct: todayScore?.food ?? null, status: fill(m.ofGoal, { pct: todayScore?.food ?? 0 }), action: m.logMeal, act: openFood },
  ];
  return <section className="plan-view">
    <header className="plan-head">
      <div><span className="date-line">{dateLine(locale, t.weekdaysShort)}</span><h1>{u.hello} {who}</h1></div>
      <HeaderActions/>
    </header>

    <CoachBubble state={warnings.length ? 'concerned' : todayDone ? 'celebrating' : 'waving'} lines={[
      fill(u.coachHi, { name: who }),
      todayDone ? u.coachDoneToday : today ? fill(u.coachToday, { title: dayTitle(today), min: today.minutes }) : u.coachWeekDone, ...warnings]}
      warn={warnings.length > 0} action={!todayDone && today ? { label: data.activeSession ? u.resume : u.start, run: () => void start(today) } : null}
      ask={{ label: u.coachAsk, run: () => go('coach') }} closeLabel={u.coachClose} busy={busy}/>

    <section className="mf-card mf-today" aria-labelledby="h-today">
      <div className="mf-head"><h2 id="h-today">{m.today}</h2><span>{fill(m.partsDone, { n: parts.filter(x => (x.pct ?? 0) >= 100).length })}</span></div>
      {parts.map(x => <div key={x.key} className="today-row">
        <div className="today-row-top"><span><strong>{x.label}</strong><small>{x.status}</small></span>{x.action && <button type="button" className="row-action" disabled={busy} onClick={x.act}>{x.action}</button>}</div>
        <div className="mf-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, x.pct ?? 0)}%` }}/></div></div>)}
      {scores && <ScoreHistory scores={scores} label={u.last7} locale={locale} weekdays={t.weekdaysShort}/>}
    </section>

    <section className="home-section" aria-labelledby="h-week">
      <div className="mf-head"><h2 id="h-week">{m.thisWeek}</h2><span>{fill(m.weekLine, { w: plan.week, stage: u.stages[plan.stage] })}{plan.deload ? ` · ${u.deloadWeek}` : ''}</span></div>
      <div className="week-days">{plan.days.map(d => <button key={d.day} type="button" className={`week-day ${d.day === plan.current ? 'current' : ''} ${d.done ? 'done' : ''}`} onClick={() => setOpen(d)}>
        <span className="wd-dot" style={d.done ? { background: pctColor(d.pct), borderColor: 'transparent', color: '#fff' } : undefined}>{d.done ? ((d.pct ?? 100) >= 100 ? <Check size={16}/> : `${d.pct}`) : d.day}</span><small>{dayTitle(d)}</small></button>)}</div>
      {plan.lastAdapt && <p className={`change-note ${plan.lastAdapt.change}`}>{plan.lastAdapt.change === 'up' ? <TrendingUp size={16}/> : plan.lastAdapt.change === 'down' ? <TrendingDown size={16}/> : <Check size={16}/>}
        {u.lastSession.replace('{pct}', String(plan.lastAdapt.pct ?? 100))} {u.adaptReason[plan.lastAdapt.reason as keyof typeof u.adaptReason]} {u.adaptChange[plan.lastAdapt.change]}</p>}
      {plan.tired && <p className="change-note down">{u.tiredToday}</p>}
      {!plan.lastAdapt && plan.lastChange && <p className={`change-note ${plan.lastChange.change}`}>{plan.lastChange.change === 'up' ? <TrendingUp size={16}/> : plan.lastChange.change === 'down' ? <TrendingDown size={16}/> : <Check size={16}/>}
        {u.changeNote[plan.lastChange.change].replace('{pct}', String(plan.lastChange.avg))}</p>}
    </section>
    <AdaptiveControls key={plan.week} plan={plan} reload={() => load()}/>

    {today ? <article className="mf-card today-workout">
      <div className="tw-media" style={today.thumb ? { backgroundImage: `url(${today.thumb})` } : undefined} aria-hidden="true">{!today.thumb && <Dumbbell size={44}/>}</div>
      <div className="tw-body">
        <span className="eyebrow-text">{fill(m.dayToday, { n: today.day })}</span>
        <h2>{dayTitle(today)}</h2>
        <p className="tw-meta">{today.minutes} {u.min} · {fill(m.aboutKcal, { kcal: today.kcal })} · {today.items.length} {u.exercises} · {location === 'home' ? u.followTimer : u.gymReps}</p>
        {!today.items.length && <p>{tt.adaptive.noMatch}</p>}
        {today.items.length > 0 && <ol className="tw-moves">{today.items.map(i => { const e = ex(i.id); return <li key={i.id}>
          <span className="ex-thumb" style={e?.thumbnailUrl ? { backgroundImage: `url(${e.thumbnailUrl})` } : undefined}/><span className="tw-name">{name(i.id)}</span>
          <span className="tw-dose">{i.sets} × {i.target}{i.unit === 'reps' ? '' : ` ${u.sec}`}</span></li>; })}</ol>}
        <button type="button" className="button primary big-start" disabled={busy} onClick={() => void start(today)}><Play size={18}/>{data.activeSession ? u.resume : u.start}</button>
        <button type="button" className="text-button tw-swap" onClick={() => setOpen(today)}>{m.swapOne}</button>
      </div></article>
      : <article className="mf-card today-workout done"><BeeMessage state="celebrating" size={72} text={u.weekDone}/></article>}

    <section className="home-section" id="my-plan" aria-labelledby="h-plan">
      <div className="mf-head"><h2 id="h-plan">{u.program}</h2><button type="button" className="text-button" onClick={() => setPrograms(true)}>{u.changePlan}</button></div>
      <p className="section-note">{u.programs[plan.program].title}. {u.planHint}</p>
      <div className="seg-switch place-switch">{(['home', 'gym'] as const).map(l => <button key={l} type="button" className={location === l ? 'selected' : ''} aria-pressed={location === l} onClick={() => switchLocation(l)}>{tt[l]}</button>)}</div>
      <div className="mf-list">{plan.days.map(d => <button key={d.day} type="button" className="mf-row" onClick={() => setOpen(d)}>
        <span className={`day-badge ${d.day === plan.current ? 'current' : ''}`}>{d.done ? <Check size={16}/> : d.day}</span>
        <span className="mf-row-text"><strong>{dayTitle(d)}</strong><small>{d.minutes} {u.min}{d.day === plan.current ? ` · ${m.today}` : ''}{d.done ? ` · ${d.pct ?? 100}%` : ''}</small></span>
        <ChevronRight size={18} aria-hidden="true"/></button>)}</div>
    </section>

    <section className="home-section" aria-labelledby="h-training">
      <h2 id="h-training">{m.otherWays}</h2>
      <div className="mf-list">{([['home', () => goPlan('home')], ['gym', () => goPlan('gym')], ['quick', () => setQuick(true)], ['build', () => openTrain({ mode: 'free', name: u.myWorkout, rows: [] })]] as const).map(([k, act]) =>
        <button key={k} type="button" className="mf-row" onClick={act}><span className="mf-row-text"><strong>{u.trainCards[k].title}</strong><small>{u.trainCards[k].sub}</small></span><ChevronRight size={18} aria-hidden="true"/></button>)}</div>
    </section>

    <section className="home-section" aria-labelledby="h-other-plans">
      <h2 id="h-other-plans">{m.otherPlans}</h2>
      <div className="program-rail">{(['personal', 'four_day', 'gym_beginner'] as const).map(p => <button key={p} type="button" className={`program-tile pt-${p} ${plan.program === p ? 'on' : ''}`} aria-pressed={plan.program === p} onClick={() => { if (plan.program !== p) void changeProgram(p); }}>
        {plan.program === p && <em>{u.currentPlan}</em>}<strong>{u.programs[p].title}</strong><small>{u.programs[p].desc}</small></button>)}</div>
    </section>

    <button type="button" className="mf-row mf-card meal-row" onClick={openFood}><span className="row-icon"><Camera size={22}/></span><span className="mf-row-text"><strong>{u.mealPhoto}</strong><small>{u.mealPhotoHint}</small></span><ChevronRight size={18} aria-hidden="true"/></button>
    <RatingPrompt/>

    {plan.pastWeeks.length > 0 && <section className="past-weeks"><button type="button" className="text-button" onClick={() => setHistory(h => !h)}><ChevronDown size={16}/>{u.pastWeeks}</button>
      {history && <ul>{plan.pastWeeks.map(w => <li key={w.week}><span>{u.week} {w.week}</span><i style={{ background: pctColor(w.avg) }}/><strong>{w.avg}%</strong></li>)}</ul>}</section>}

    {quick && <Modal title={u.quickPick} close={() => setQuick(false)}>
      <div className="quick-row">{[7, 15, 20].map(m => <button key={m} type="button" className="quick-card" onClick={() => { setQuick(false); openTrain({ mode: 'follow', focus: 'all', minutes: m }); }}><Timer size={22}/><strong>{m} {u.min}</strong><small>{u.quickHint}</small></button>)}</div>
    </Modal>}
    {open && <Modal title={`${u.day} ${open.day} · ${dayTitle(open)}`} close={() => { setOpen(null); setSwapFor(null); }}>
      <p className="day-meta"><Clock size={15}/>{open.minutes} {u.min} · <Flame size={15}/>{open.kcal} kcal{open.done ? ` · ${open.pct ?? 100}%` : ''}</p>
      {open.split === 'cardio' && <p className="explain-box">{u.cardioNote.replace('{bmi}', plan.bmi ? String(plan.bmi) : '—')}</p>}
      {swapFor ? <div className="swap-panel">
        <div className="swap-head"><strong>{fill(u.swapTitle, { name: name(swapFor.id) })}</strong><button type="button" className="icon-button" aria-label={u.coachClose} onClick={() => setSwapFor(null)}><X size={18}/></button></div>
        <small className="muted">{u.swapHint}</small>
        {swapFor.swappedFrom && <button type="button" className="button secondary" disabled={busy} onClick={() => void swap(swapFor, null)}><Undo2 size={16}/>{u.undoSwap}: {name(swapFor.swappedFrom)}</button>}
        {alternatives(swapFor).length ? <ul className="sheet-exercises">{alternatives(swapFor).map(e => <li key={e.id}><button type="button" className="swap-option" disabled={busy} onClick={() => void swap(swapFor, e.id)}>
          <span className="ex-thumb" style={e.thumbnailUrl ? { backgroundImage: `url(${e.thumbnailUrl})` } : undefined}/><span><strong>{name(e.id)}</strong><small>{(e.primaryMuscles ?? []).map(m => tt.muscleNames[m as keyof typeof tt.muscleNames] ?? m).join(' · ')}</small></span></button></li>)}</ul>
          : <p className="muted small">{u.swapNone}</p>}
      </div> : <ul className="sheet-exercises">{open.items.map(i => { const e = ex(i.id); return <li key={i.id}>
        <span className="ex-thumb" style={e?.thumbnailUrl ? { backgroundImage: `url(${e.thumbnailUrl})` } : undefined}/>
        <span><strong>{name(i.id)}</strong><small>{i.sets} × {i.target} {i.unit === 'reps' ? u.reps : u.sec}{i.perSide ? ` · ${tt.perSide}` : ''}{i.swappedFrom ? ` · ${u.swapped}` : ''}</small></span>
        {!open.done && <button type="button" className="swap-btn" onClick={() => setSwapFor(i)} aria-label={`${u.swap}: ${name(i.id)}`}><ArrowLeftRight size={16}/>{u.swap}</button>}</li>; })}</ul>}
      {(plan.balance?.plan.length ?? 0) > 0 && <p className="change-note down">{u.coachPlanWarn} {plan.balance!.plan.map(issueText).join(' ')}</p>}
      <button type="button" className={`button ${open.done ? 'secondary' : 'primary'} big-start`} disabled={busy} onClick={() => void start(open)}>{open.done ? <><Repeat size={18}/>{u.again}</> : <><Play size={20}/>{u.start}</>}</button>
    </Modal>}
    {programs && <Modal title={u.chooseProgram} close={() => setPrograms(false)}>
      <div className="program-options">{(['personal', 'four_day', 'gym_beginner'] as const).map(p => <button key={p} type="button" className={`quiz-option ${plan.program === p ? 'on' : ''}`} onClick={() => void changeProgram(p)}>
        <span><strong>{u.programs[p].title}</strong><small>{u.programs[p].desc}</small></span>{plan.program === p && <Check size={20}/>}</button>)}</div>
    </Modal>}
  </section>;
}

/** Gaps remain gaps: days without a score are never plotted as zero. */
function ScoreHistory({ scores, label, locale, weekdays }: { scores: Scores; label: string; locale: string; weekdays: string[] }) {
  const segments: { x: number; y: number }[][] = [];
  scores.days.forEach((d, i) => {
    if (d.score === null) return;
    if (i === 0 || scores.days[i - 1].score === null) segments.push([]);
    segments[segments.length - 1].push({ x: 20 + i * 50, y: 110 - Math.max(0, Math.min(100, d.score)) });
  });
  return <div className="solaris-history"><small>{label}</small>
    <svg viewBox="0 0 340 120" role="img" aria-label={`${label}: ${scores.days.map(d => `${d.day}: ${d.score === null ? '—' : `${d.score}%`}`).join(', ')}`}>
      {[10, 60, 110].map(y => <line key={y} className="chart-grid" x1="20" x2="320" y1={y} y2={y}/>)}
      {segments.map((points, i) => <g key={i}>
        {points.length > 1 && <><polygon className="chart-area" points={`${points[0].x},110 ${points.map(p => `${p.x},${p.y}`).join(' ')} ${points[points.length - 1].x},110`}/><polyline className="chart-line" points={points.map(p => `${p.x},${p.y}`).join(' ')}/></>}
        {points.map(p => <circle key={p.x} cx={p.x} cy={p.y} r="4"/>)}</g>)}
    </svg>
    <div className="solaris-history-labels">{scores.days.map(d => <span key={d.day}>{locale.startsWith('my') ? new Intl.NumberFormat('my-MM').format(Number(d.day.slice(8))) : weekdays[(new Date(d.day + 'T12:00:00Z').getUTCDay() + 6) % 7]}</span>)}</div>
  </div>;
}

// The bee coach greets the user at the top of Home like a chat: typing dots, then short lines (today's session, balance warnings).
// Closing hides it for the rest of the day (per tab session); it comes back when the message set changes.
function CoachBubble({ state, lines, warn, action, ask, closeLabel, busy }: { state: 'concerned' | 'celebrating' | 'waving'; lines: string[]; warn: boolean;
  action: { label: string; run: () => void } | null; ask: { label: string; run: () => void }; closeLabel: string; busy: boolean }) {
  const KEY = `mingalar-coach-${new Date().toDateString()}-${lines.length}`;
  const [hidden, setHidden] = useState(false); const [shown, setShown] = useState(0);
  useEffect(() => {
    try { if (sessionStorage.getItem(KEY)) { setHidden(true); return; } } catch { /* optional */ }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(lines.length); return; }
    const timers = lines.map((_, i) => setTimeout(() => setShown(i + 1), 450 + i * 650)); return () => timers.forEach(clearTimeout);
  }, [KEY, lines.length]);
  if (hidden) return null;
  return <section className={`coach-bubble ${warn ? 'warn' : ''}`} aria-live="polite">
    <div className="cb-bee"><Mascot state={state} size={40} label=""/></div>
    <div className="cb-chat">
      {lines.slice(0, shown).map((l, i) => <p key={i} className={`cb-msg ${i >= 2 ? 'alert' : ''}`}>{l}</p>)}
      {shown < lines.length && <p className="cb-msg typing" aria-hidden="true"><i/><i/><i/></p>}
    </div>
    {shown >= lines.length && <div className="cb-actions">
      {action && <Button size="sm" disabled={busy} onClick={action.run}><Play/>{action.label}</Button>}
      <Button size="sm" variant="outline" onClick={ask.run}><MessageCircle/>{ask.label}</Button></div>}
    <button type="button" className="cb-close icon-button" aria-label={closeLabel} onClick={() => { setHidden(true); try { sessionStorage.setItem(KEY, '1'); } catch { /* optional */ } }}><X size={16}/></button>
  </section>;
}

// The day's score counts up once when Home opens (the one orchestrated moment); instant under reduced motion.
function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(to);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || to <= 0) { setV(to); return; }
    let raf = 0; const t0 = performance.now(), dur = 700;
    const step = (now: number) => { const k = Math.min(1, (now - t0) / dur); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    setV(0); raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v}</>;
}

// Some browsers ship no Burmese calendar data and silently fall back to English; then build the line from our own labels.
function dateLine(locale: string, weekdays: readonly string[]) {
  const d = new Date(), fmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  if (!locale.startsWith('my') || fmt.resolvedOptions().locale.startsWith('my')) return fmt.format(d);
  return `${weekdays[(d.getDay() + 6) % 7]}, ${d.getDate()}/${d.getMonth() + 1}`;
}
