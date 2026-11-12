'use client';
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Activity, ArrowLeft, Bike, Bone, Check, Dumbbell, Flame, Footprints, Hand, HeartPulse, Home, PersonStanding, ShieldCheck, Sofa, Sprout, Sun, Sunrise, Sunset, Timer, TrendingUp, Trophy, UserRound, Users, Zap } from 'lucide-react';
import { useApp } from '@/shared/app-context';
import { api, trainingApi } from '@/shared/client';
import { gameApi } from '@/shared/game-client';
import { errorText, useLanguage } from '@/shared/language';
import { useTrainingLanguage } from '@/shared/training-language';
import { bmiBand, bmiOf } from '@/shared/plan';
import { BeeAvatar } from '../gamification/mascot';
import { bodyPreferencesSchema, DEFAULT_BODY_PREFERENCES, type BodyPreferences } from '@/shared/body-preferences';
import { BodyVisual } from './body-visual';
import { BodyGoalFields, FocusChoices } from './body-goal-fields';

// One question per screen, big tap targets, progress bar. Answers create the profile and a personal plan.
type Goal = 'lose' | 'muscle' | 'strength' | 'fit';
type A = { trainTime: 'morning' | 'midday' | 'evening'; nickname: string; activity: 'sedentary' | 'light' | 'active'; minutes: 10 | 20 | 30 | 45; goal: Goal; sex: 'female' | 'male' | 'unspecified'; age: number; height: number; weight: number; target: number; place: 'home' | 'gym'; level: 'beginner' | 'intermediate' | 'advanced'; days: number[]; avoid: string[]; health: boolean | null; equipment: string[]; bodyPreferences: BodyPreferences; screening: Record<string, boolean> };
const AGES = [16, 22, 30, 40, 50, 60];
const STEPS = ['welcome', 'nickname', 'goal', 'focus', 'waist', 'glutes', 'sex', 'age', 'height', 'weight', 'target', 'activity', 'place', 'equipment', 'level', 'days', 'trainTime', 'minutes', 'avoid', 'health', 'review'] as const;

export function OnboardingQuiz() {
  const { data, refresh, notify, go } = useApp(); const { t, locale } = useLanguage(); const tt = useTrainingLanguage(); const q = tt.quiz;
  const [i, setI] = useState(0); const [busy, setBusy] = useState(false); const [making, setMaking] = useState(-1); // -1 idle, 0-3 saving step, 4 ready
  const [editing, setEditing] = useState(false);
  const [a, setA] = useState<A>({ trainTime: 'evening', nickname: '', activity: 'light', minutes: 20, goal: 'fit', sex: 'unspecified', age: 30, height: 165, weight: 65, target: 62, place: 'home', level: 'beginner', days: [0, 2, 4], avoid: [], health: null, equipment: [], bodyPreferences: DEFAULT_BODY_PREFERENCES, screening: {} });
  const step = STEPS[i]; const set = (p: Partial<A>) => setA(v => ({ ...v, ...p }));
  const details = q.details, titles = { ...q.titles, ...details.titles }, hints = { ...q.hints, ...details.hints };
  const advance = () => { setI(editing ? STEPS.length - 1 : i + 1); setEditing(false); };
  const edit = (s: typeof STEPS[number]) => { setEditing(true); setI(STEPS.indexOf(s)); };
  const bmi = bmiOf(a.weight, a.height), band = bmiBand(bmi);
  const canNext = step === 'days' ? a.days.length >= 2 && a.days.length <= 6 : step === 'health' ? a.health === false || (a.health === true && Object.values(a.screening).some(Boolean)) : (step === 'waist' || step === 'glutes' || step === 'review') ? bodyPreferencesSchema.safeParse(a.bodyPreferences).success : true;
  useEffect(() => { if (step === 'target' && a.target === 62) set({ target: a.goal === 'lose' ? Math.round(a.weight * 0.93) : a.goal === 'muscle' ? Math.round(a.weight * 1.03) : a.weight }); }, [step]);
  async function finish() {
    setBusy(true); setMaking(0);
    try {
      const goal = a.goal === 'muscle' ? 'build_muscle' : a.goal === 'strength' ? 'build_strength' : 'general_fitness';
      const equipment = ['body weight', ...a.equipment];
      const screening = { heart: false, chestPain: false, dizziness: false, joint: a.avoid.length > 0, medication: false, pregnancy: false, other: false, ...(a.health ? a.screening : {}) };
      await api('profile', { locale, goal, experience: a.level, equipment, daysPerWeek: a.days.length, limitations: a.avoid.map(x => q.avoidOpts[x as keyof typeof q.avoidOpts]).join(', '), weightUnit: data.profile?.weightUnit ?? 'kg', distanceUnit: data.profile?.distanceUnit ?? 'km', screening, timezone: 'Asia/Yangon' });
      setMaking(1);
      await api('measurements', { weight: a.weight, unit: 'kg', waistCm: a.bodyPreferences.waistCm ?? null });
      await trainingApi('energy/body', { heightCm: a.height, birthYear: new Date().getFullYear() - a.age, sex: a.sex, goalWeightKg: a.target, weightGoal: a.goal === 'lose' ? 'lose' : a.goal === 'muscle' ? 'gain' : 'maintain' });
      setMaking(2);
      await gameApi('schedule', { weekdays: a.days });
      await trainingApi('prefs', { trainTime: a.trainTime, activityLevel: a.activity, sessionMinutes: a.minutes, nickname: a.nickname.trim(), bodyPreferences: { ...a.bodyPreferences, protectedAreas: a.avoid } });
      setMaking(3);
      await trainingApi('program', { program: a.place === 'gym' && a.level === 'beginner' ? 'gym_beginner' : 'personal' });
      try { localStorage.setItem('mingalar-location', a.place); } catch { /* optional */ }
      setMaking(4);
    } catch (error) { notify(errorText(error, t)); setMaking(-1); }
    finally { setBusy(false); }
  }
  if (making >= 0) { const ready = making >= q.makingSteps.length; return <section className="quiz quiz-making" aria-live="polite">
    <CoachSay title={ready ? q.ready : q.making} hint={ready ? q.readyHint : q.makingHint}/>
    <ol className="making-steps">{q.makingSteps.map((label, k) => <li key={label} className={k < making ? 'done' : k === making ? 'active' : ''}><i aria-hidden="true">{k < making && <Check size={15}/>}</i><span>{label}</span></li>)}</ol>
    <div className="quiz-footer">{ready ? <button type="button" className="button primary quiz-next" disabled={busy} onClick={async () => { setBusy(true); await refresh(); go('home'); }}>{q.seePlan}</button> : <p className="making-wait">{q.makingWait}</p>}</div>
  </section>; }
  // Text option cards with a radio (one answer) or checkbox (several) mark, as in the MingalarFit design.
  const Option = ({ on, label, sub, onClick, multi = false }: { on: boolean; label: string; sub?: string; onClick: () => void; multi?: boolean }) =>
    <button type="button" className={`quiz-option ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}><span><strong>{label}</strong>{sub && <small>{sub}</small>}</span><i className={`qo-mark ${multi ? 'box' : 'radio'}`} aria-hidden="true">{multi && on && <Check size={15}/>}</i></button>;
  // NumberStepper is rendered directly (not wrapped in an inline component) so press-and-hold survives re-renders.
  const stepLabels = { dec: q.decrease, inc: q.increase, hint: q.holdHint };
  const questionCount = STEPS.length - 2, isQuestion = i > 0 && i < STEPS.length - 1;
  return <section className="quiz" data-step={step}>
    <div className="quiz-top">{i > 0 ? <button type="button" className="icon-button" aria-label={tt.ux.back} onClick={() => { setI(editing ? STEPS.length - 1 : i - 1); setEditing(false); }}><ArrowLeft size={22}/></button> : <span className="quiz-top-space"/>}
      <small>{isQuestion ? q.questionOf.replace('{n}', String(i)).replace('{total}', String(questionCount)) : ''}</small></div>
    <div className="quiz-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={i + 1}><i style={{ width: `${(i + 1) / STEPS.length * 100}%` }}/></div>
    <CoachSay key={`t-${step}`} title={titles[step]} hint={hints[step]}/>
    <div key={step} className="quiz-body">
      {step === 'welcome' && <div className="quiz-welcome"><div className="welcome-visual"><BodyVisual area="full"/><div className="welcome-plan" aria-hidden="true"><Check size={26}/><span/><span/><span/><div>{[1, 2, 3, 4, 5, 6, 7].map(n => <i key={n} className={n % 2 ? 'on' : ''}/>)}</div></div></div><p className="intro-time"><Timer size={22}/>{details.introTime}</p><ul>{details.introPoints.map(point => <li key={point}><Check size={22}/>{point}</li>)}</ul></div>}
      {step === 'focus' && <><FocusChoices value={a.bodyPreferences} onChange={bodyPreferences => set({ bodyPreferences })}/><p className="goal-note">{details.balancedNote}</p></>}
      {(step === 'waist' || step === 'glutes') && <BodyGoalFields section={step} value={a.bodyPreferences} onChange={bodyPreferences => set({ bodyPreferences })}/>}
      {step === 'equipment' && <div className="quiz-grid"><Option on={!a.equipment.length} label={details.equipment.none} multi onClick={() => set({ equipment: [] })}/>{(a.place === 'gym' ? ['dumbbell', 'barbell', 'band', 'bench', 'cable', 'machine'] as const : ['dumbbell', 'band', 'bench'] as const).map(key => <Option key={key} on={a.equipment.includes(key)} label={t.equipmentLabels[key]} multi onClick={() => set({ equipment: a.equipment.includes(key) ? a.equipment.filter(e => e !== key) : [...a.equipment, key] })}/>)}</div>}
      {step === 'nickname' && <input className="quiz-text" value={a.nickname} maxLength={30} placeholder={q.nicknamePlaceholder} onChange={e => set({ nickname: e.target.value })} autoFocus/>}
      {step === 'trainTime' && <div className="quiz-grid">{([['morning', Sunrise], ['midday', Sun], ['evening', Sunset]] as const).map(([v, I]) => <Option key={v} on={a.trainTime === v} label={q.times[v]} sub={q.timeSubs[v]} onClick={() => { set({ trainTime: v }) }}/>)}</div>}
      {step === 'activity' && <div className="quiz-grid">{([['sedentary', Sofa], ['light', Footprints], ['active', Bike]] as const).map(([v, I]) => <Option key={v} on={a.activity === v} label={q.activities[v]} sub={q.activitySubs[v]} onClick={() => { set({ activity: v }) }}/>)}</div>}
      {step === 'minutes' && <div className="quiz-grid">{([10, 20, 30, 45] as const).map(v => <Option key={v} on={a.minutes === v} label={`${v} ${tt.ux.min}`} sub={q.minuteSubs[String(v) as '10']} onClick={() => { set({ minutes: v }) }}/>)}</div>}
      {step === 'goal' && <div className="quiz-grid">{([['lose', Flame], ['muscle', Dumbbell], ['strength', Zap], ['fit', HeartPulse]] as const).map(([g, I]) => <Option key={g} on={a.goal === g} label={q.goals[g]} sub={details.goalSubs[g]} onClick={() => { set({ goal: g }) }}/>)}</div>}
      {step === 'sex' && <div className="quiz-grid">{([['female', UserRound], ['male', UserRound], ['unspecified', Users]] as const).map(([s, I]) => <Option key={s} on={a.sex === s} label={q.sexes[s]} onClick={() => { set({ sex: s }) }}/>)}</div>}
      {step === 'age' && <div className="quiz-grid">{AGES.map((v, k) => <Option key={v} on={a.age === v} label={q.ages[k]} onClick={() => { set({ age: v }) }}/>)}</div>}
      {step === 'height' && <NumberStepper value={a.height} min={130} max={210} unit="cm" onChange={v => set({ height: v })} label={titles[step]} labels={stepLabels}/>}
      {step === 'weight' && <><NumberStepper value={a.weight} min={35} max={180} unit="kg" onChange={v => set({ weight: v })} label={titles[step]} labels={stepLabels}/>
        {bmi !== null && <div className={`quiz-bmi bmi-${band}`}><span>BMI</span><strong>{bmi}</strong><small>{q.bmiBands[band!]}</small></div>}</>}
      {step === 'target' && <NumberStepper value={a.target} min={35} max={180} unit="kg" onChange={v => set({ target: v })} label={titles[step]} labels={stepLabels}/>}
      {step === 'place' && <div className="quiz-grid"><Option on={a.place === 'home'} label={q.places.home} sub={q.places.homeSub} onClick={() => { set({ place: 'home', equipment: a.equipment.filter(e => !['barbell', 'cable', 'machine'].includes(e)) }) }}/>
        <Option on={a.place === 'gym'} label={q.places.gym} sub={q.places.gymSub} onClick={() => { set({ place: 'gym', equipment: a.place === 'gym' ? a.equipment : ['dumbbell', 'barbell', 'bench', 'cable', 'machine'] }) }}/></div>}
      {step === 'level' && <div className="quiz-grid">{([['beginner', Sprout], ['intermediate', TrendingUp], ['advanced', Trophy]] as const).map(([l, I]) => <Option key={l} on={a.level === l} label={q.levels[l]} sub={q.levelSubs[l]} onClick={() => { set({ level: l }) }}/>)}</div>}
      {step === 'days' && <><div className="quiz-days">{t.weekdaysShort.map((d, k) => <button key={k} type="button" aria-pressed={a.days.includes(k)} className={a.days.includes(k) ? 'on' : ''} onClick={() => set({ days: a.days.includes(k) ? a.days.filter(x => x !== k) : [...a.days, k].sort() })}>{d}</button>)}</div>
        <p className="quiz-hint">{q.daysCount.replace('{n}', String(a.days.length))}</p></>}
      {step === 'avoid' && <div className="quiz-grid">{([['none', ShieldCheck], ['knees', Bone], ['back', PersonStanding], ['shoulders', Activity], ['wrists', Hand]] as const).map(([k, I]) => <Option key={k} on={k === 'none' ? !a.avoid.length : a.avoid.includes(k)} label={q.avoidOpts[k]}
        multi onClick={() => set({ avoid: k === 'none' ? [] : a.avoid.includes(k) ? a.avoid.filter(x => x !== k) : [...a.avoid, k] })}/>)}</div>}
      {step === 'health' && <><div className="quiz-grid"><Option on={a.health === false} label={q.healthNo} onClick={() => set({ health: false })}/><Option on={a.health === true} label={q.healthYes} onClick={() => set({ health: true })}/></div>
        {a.health && <><div className="health-options">{(['heart', 'chestPain', 'dizziness', 'joint', 'medication', 'pregnancy', 'other'] as const).map(key => <label className="check" key={key}><input type="checkbox" checked={!!a.screening[key]} onChange={e => set({ screening: { ...a.screening, [key]: e.target.checked } })}/>{tt.screeningQ[key]}</label>)}</div><p className="explain-box">{q.healthAdvice}</p></>}</>}
      {step === 'review' && <div className="quiz-review">
        <Review label={q.titles.nickname} editLabel={details.edit} edit={() => edit('nickname')}><p>{a.nickname || data.user.name}</p></Review>
        <Review label={details.overview} editLabel={details.edit} edit={() => edit('goal')}><strong>{q.goals[a.goal]}</strong></Review>
        <Review label={details.titles.focus} editLabel={details.edit} edit={() => edit('focus')}><p>{a.bodyPreferences.focusAreas.map(f => details.focus[f]).join(', ')}</p></Review>
        <Review label={details.waist} editLabel={details.edit} edit={() => edit('waist')}><p>{a.bodyPreferences.currentWaist === 'unsure' ? details.unsure : details.waistBuilds[a.bodyPreferences.currentWaist]} → {details.waistGoals[a.bodyPreferences.waistGoal]}</p>{a.bodyPreferences.waistCm != null && <p>{details.waistCm}: {a.bodyPreferences.waistCm}</p>}</Review>
        <Review label={details.glutes} editLabel={details.edit} edit={() => edit('glutes')}><p>{a.bodyPreferences.currentGlutes === 'unsure' ? details.unsure : details.gluteBuilds[a.bodyPreferences.currentGlutes]} → {details.gluteGoals[a.bodyPreferences.gluteGoal]}</p>{a.bodyPreferences.hipsCm != null && <p>{details.hipsCm}: {a.bodyPreferences.hipsCm}</p>}</Review>
        <Review label={q.titles.height} editLabel={details.edit} edit={() => edit('height')}><strong>{a.height} cm</strong></Review>
        <Review label={q.titles.weight} editLabel={details.edit} edit={() => edit('weight')}><strong>{a.weight} kg</strong></Review>
        <Review label={q.titles.target} editLabel={details.edit} edit={() => edit('target')}><strong>{a.target} kg</strong></Review>
        <Review label={q.titles.sex} editLabel={details.edit} edit={() => edit('sex')}><p>{q.sexes[a.sex]}</p></Review>
        <Review label={q.titles.age} editLabel={details.edit} edit={() => edit('age')}><p>{q.ages[AGES.indexOf(a.age)]}</p></Review>
        <Review label={q.titles.level} editLabel={details.edit} edit={() => edit('level')}><p>{q.levels[a.level]}</p></Review>
        <Review label={q.titles.activity} editLabel={details.edit} edit={() => edit('activity')}><p>{q.activities[a.activity]}</p></Review>
        <Review label={q.titles.place} editLabel={details.edit} edit={() => edit('place')}><p>{q.places[a.place]}</p></Review>
        <Review label={details.titles.equipment} editLabel={details.edit} edit={() => edit('equipment')}><p>{a.equipment.length ? a.equipment.map(e => t.equipmentLabels[e as 'dumbbell']).join(', ') : details.equipment.none}</p></Review>
        <Review label={q.titles.days} editLabel={details.edit} edit={() => edit('days')}><strong>{a.days.map(d => t.weekdaysShort[d]).join(', ')}</strong><p>{details.rest}</p></Review>
        <Review label={q.titles.minutes} editLabel={details.edit} edit={() => edit('minutes')}><strong>{a.minutes} {tt.ux.min}</strong></Review>
        <Review label={q.titles.trainTime} editLabel={details.edit} edit={() => edit('trainTime')}><p>{q.times[a.trainTime]}</p></Review>
        <Review label={details.recovery} editLabel={details.edit} edit={() => edit('avoid')}><p>{a.avoid.length ? a.avoid.map(k => q.avoidOpts[k as 'knees']).join(', ') : q.avoidOpts.none}</p></Review>
        <Review label={details.health} editLabel={details.edit} edit={() => edit('health')}><p>{a.health ? details.yes : details.no}</p></Review>
        <p className="goal-note">{details.balancedNote}</p>
      </div>}
    </div>
    <div className="quiz-footer"><button type="button" className="button primary quiz-next" disabled={!canNext || busy} onClick={() => (i === STEPS.length - 1 ? void finish() : advance())}>{i === STEPS.length - 1 ? q.create : step === 'welcome' ? details.start : q.next}</button></div>
  </section>;
}

function Review({ label, editLabel, edit, children }: { label: string; editLabel: string; edit: () => void; children: React.ReactNode }) {
  return <section className="review-row"><div><small>{label}</small>{children}</div><button type="button" className="text-button" onClick={edit}>{editLabel}</button></section>;
}

// The coach asks each question: bee avatar + speech bubble holding the title and hint.
function CoachSay({ title, hint }: { title: string; hint?: string }) {
  return <div className="coach-say"><BeeAvatar size={40}/><div className="coach-bubble-text"><h1 className="quiz-title">{title}</h1>{hint && <p className="quiz-hint">{hint}</p>}</div></div>;
}

// Big number with minus / plus (press and hold repeats, speeding up); the number itself can be typed.
function NumberStepper({ value, min, max, unit, label, onChange, labels }: { value: number; min: number; max: number; unit: string; label: string; onChange: (v: number) => void; labels: { dec: string; inc: string; hint: string } }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const latest = useRef(value); latest.current = value;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const stop = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => stop, []);
  const bump = (dir: 1 | -1, delay: number) => {
    const next = clamp(latest.current + dir); latest.current = next; onChange(next);
    if (next === min || next === max) { stop(); return; }
    timer.current = setTimeout(() => bump(dir, Math.max(50, delay * 0.8)), delay);
  };
  const commit = () => { const n = Math.round(Number(draft)); if (draft.trim() && Number.isFinite(n)) onChange(clamp(n)); else setDraft(String(value)); };
  const press = (dir: 1 | -1) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => { e.preventDefault(); stop(); bump(dir, 420); },
    onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop,
    onClick: (e: ReactMouseEvent<HTMLButtonElement>) => { if (e.detail === 0) onChange(clamp(value + dir)); }, // keyboard Enter / Space
    onContextMenu: (e: ReactMouseEvent<HTMLButtonElement>) => e.preventDefault(),
  });
  return <div className="quiz-number">
    <div className="qn-box">
      <button type="button" className="qn-btn" aria-label={`${labels.dec} (${unit})`} disabled={value <= min} {...press(-1)}>&minus;</button>
      <label className="qn-value"><input className="qn-number" type="number" inputMode="numeric" min={min} max={max} value={draft} aria-label={`${label} (${unit})`} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); }}/><span>{unit}</span></label>
      <button type="button" className="qn-btn" aria-label={`${labels.inc} (${unit})`} disabled={value >= max} {...press(1)}>+</button>
    </div>
    <p className="qn-hint">{labels.hint}</p>
  </div>;
}
