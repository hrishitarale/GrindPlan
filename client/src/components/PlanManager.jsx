import { useEffect, useState } from 'react'
import { ArrowRight, Check, ChevronDown, Dumbbell, Flame, HeartPulse, Play } from 'lucide-react'
import { workoutByWeekday } from '../data/workouts.js'

const week = [
  { day: 'MON', icon: '↓', group: 'Legs · Glutes' }, { day: 'TUE', icon: '↑', group: 'Chest · Shoulders' },
  { day: 'WED', icon: '↗', group: 'Back · Biceps' }, { day: 'THU', icon: '↔', group: 'Mobility · Stretching' },
  { day: 'FRI', icon: '↑', group: 'Chest · Back · Arms' }, { day: 'SAT', icon: '↓', group: 'Quads · Glutes · Calves' },
  { day: 'SUN', icon: '✳', group: 'Recovery · Recharge' },
]
const templates = {
  'Push / Pull / Legs': ['Push day','Pull day','Leg day','Active recovery','Push day','Pull day','Rest & reset'],
  'Bro split': ['Chest day','Back day','Shoulders','Leg day','Arms day','Conditioning','Rest & reset'],
  'Full body': ['Full body','Mobility day','Full body','Rest & reset','Full body','Active recovery','Rest & reset'],
  'Upper / Lower': ['Upper body','Lower body','Active recovery','Upper body','Lower body','Mobility day','Rest & reset'],
}
const restNames = new Set(['Active recovery','Rest & reset','Mobility day','Conditioning'])
const moves = {
  push: ['Dumbbell bench press','Overhead press','Incline dumbbell press','Triceps cable pushdown'],
  pull: ['Lat pulldown','Seated cable row','Face pull','Dumbbell curl'],
  leg: ['Barbell back squat','Romanian deadlift','Leg press','Walking lunges'],
  upper: ['Dumbbell bench press','Seated cable row','Overhead press'],
  full: ['Barbell back squat','Dumbbell bench press','Lat pulldown'],
  chest: ['Dumbbell bench press','Incline dumbbell press'], back: ['Lat pulldown','Seated cable row'],
  shoulder: ['Overhead press','Face pull'], arm: ['Dumbbell curl','Triceps cable pushdown'],
}
const byFocus = (focus) => focus.toLowerCase().includes('push') ? moves.push : focus.toLowerCase().includes('pull') || focus.toLowerCase().includes('back') ? moves.pull : focus.toLowerCase().includes('leg') || focus.toLowerCase().includes('lower') ? moves.leg : focus.toLowerCase().includes('chest') ? moves.chest : focus.toLowerCase().includes('shoulder') ? moves.shoulder : focus.toLowerCase().includes('arm') ? moves.arm : focus.toLowerCase().includes('upper') ? moves.upper : focus.toLowerCase().includes('full') ? moves.full : []

export default function PlanManager({ plan, availableExercises = [], onStart, onSave }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(plan?.title || 'My training plan')
  const [template, setTemplate] = useState('Custom plan')
  const [schedule, setSchedule] = useState(() => makeSchedule(plan, availableExercises))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const today = (new Date().getDay() + 6) % 7
  useEffect(() => { if (plan?.days) { setTitle(plan.title); setSchedule(makeSchedule(plan, availableExercises)) } }, [plan, availableExercises])
  function applyTemplate(name) {
    const focusList = templates[name]
    if (!focusList) { setTemplate(name); return }
    setTemplate(name)
    setSchedule((rows) => rows.map((day, index) => {
      const focus = focusList[index]; const isRestDay = restNames.has(focus)
      const names = byFocus(focus)
      const selected = names.map((moveName) => availableExercises.find((item) => item.name?.toLowerCase() === moveName.toLowerCase())).filter(Boolean)
      return { ...day, focus, isRestDay, exercises: selected.map((exercise) => ({ exercise: getId(exercise), sets: 3, reps: '8–12', restSeconds: 90 })) }
    }))
  }
  async function save() {
    setSaving(true); setError('')
    try {
      await onSave({ ...(plan?._id ? { _id: plan._id } : {}), title, active: true, days: schedule.map((day, index) => ({ dayOfWeek: (index + 1) % 7, focus: day.focus, isRestDay: day.isRestDay, exercises: day.isRestDay ? [] : day.exercises.map((item) => ({ exercise: typeof item.exercise === 'object' ? item.exercise._id || item.exercise.id : item.exercise, sets: Number(item.sets) || 3, reps: item.reps || '8–12', restSeconds: Number(item.restSeconds) || 90 })) })) })
      setEditing(false)
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  function changeDay(dayIndex, patch) { setSchedule((rows) => rows.map((row, index) => index === dayIndex ? { ...row, ...patch } : row)) }
  function chooseMoves(dayIndex, event) {
    const selected = Array.from(event.target.selectedOptions, (option) => option.value)
    const old = schedule[dayIndex].exercises
    const exercises = selected.map((id) => old.find((item) => String(typeof item.exercise === 'object' ? item.exercise._id || item.exercise.id : item.exercise) === id) || { exercise: id, sets: 3, reps: '8–12', restSeconds: 90 })
    changeDay(dayIndex, { exercises })
  }
  return <><div className="page-heading secondary-heading"><div><div className="eyebrow">THE ROAD AHEAD</div><h1>YOUR WEEK, <span>YOUR PACE.</span></h1><p className="page-subtitle">Build a weekly split that moves with you.</p></div><button className="primary-small" onClick={onStart}><Play size={14} fill="currentColor" /> Start today</button></div><section className="content-card plan-card"><div className="content-card-head"><div><span className="section-kicker">{plan?._id ? 'ACTIVE PLAN · YOUR TRAINING' : 'SAMPLE PLAN · SAVED TO YOUR DEVICE'}</span><h3>{plan?.title || 'Weekly training split'}</h3></div><button className="edit-button" onClick={() => setEditing(!editing)}>{editing ? 'Close editor' : 'Edit plan'} <ArrowRight size={14} /></button></div>{editing && <div className="plan-editor"><div className="template-bar"><label>Plan name<input value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>Start from a template<select value={template} onChange={(e) => applyTemplate(e.target.value)}><option>Custom plan</option>{Object.keys(templates).map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="plan-editor-days">{schedule.map((day, index) => <div className="plan-edit-day" key={day.day}><div className="plan-edit-day-head"><span>{day.day}</span><label><input type="checkbox" checked={day.isRestDay} onChange={(e) => changeDay(index, { isRestDay: e.target.checked })} /> Rest / recovery</label></div><input className="plan-focus-input" value={day.focus} onChange={(e) => changeDay(index, { focus: e.target.value })} aria-label={`${day.day} focus`} /><label className="exercise-select-label">Exercises <select multiple value={day.exercises.map((item) => String(typeof item.exercise === 'object' ? item.exercise._id || item.exercise.id : item.exercise))} onChange={(event) => chooseMoves(index, event)}>{availableExercises.map((exercise) => <option key={getId(exercise)} value={getId(exercise)}>{exercise.name}</option>)}</select><small>Use Ctrl / ⌘ to select multiple.</small></label>{day.exercises.length > 0 && <div className="plan-move-list">{day.exercises.map((item, moveIndex) => { const exercise = availableExercises.find((candidate) => String(getId(candidate)) === String(typeof item.exercise === 'object' ? item.exercise._id || item.exercise.id : item.exercise)); return <div key={`${day.day}-${moveIndex}`}><span>{exercise?.name || item.exercise?.name || 'Exercise'}</span><label>SETS<input type="number" min="1" max="20" value={item.sets} onChange={(e) => changeDay(index, { exercises: day.exercises.map((row, i) => i === moveIndex ? { ...row, sets: e.target.value } : row) })} /></label><label>REPS<input value={item.reps} onChange={(e) => changeDay(index, { exercises: day.exercises.map((row, i) => i === moveIndex ? { ...row, reps: e.target.value } : row) })} /></label></div> })}</div>}</div>)}</div>{error && <div className="form-error">{error}</div>}<button className="primary-small" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save weekly plan'} <Check size={14} /></button></div>}<div className="plan-week">{schedule.map((day, index) => <div key={day.day} className={`plan-day ${index === today ? 'plan-today' : ''} ${day.isRestDay ? 'plan-rest' : ''}`}><div className="plan-day-top"><span>{day.day}</span>{index === today && <i>TODAY</i>}</div><div className="plan-day-icon">{week[index].icon}</div><b>{day.focus}</b><span>{day.isRestDay ? 'Mobility · Recovery' : day.exercises.length ? `${day.exercises.length} planned movements` : week[index].group}</span><div className="plan-day-bottom">{day.isRestDay ? <><HeartPulse size={12} /> Recovery</> : index === today ? <><Flame size={12} /> Up next</> : <><Dumbbell size={12} /> Training</>}</div></div>)}</div><div className="plan-note"><span>✳</span><p><b>Rest is part of the plan.</b> Recovery days help your body come back stronger. Keep it light and listen to how you feel.</p></div></section></>
}

function getId(exercise) { return exercise._id || exercise.id }
function makeSchedule(plan, availableExercises) {
  return week.map((day, index) => {
    const dayOfWeek = (index + 1) % 7
    const source = plan?.days?.find((item) => item.dayOfWeek === dayOfWeek)
    const starter = workoutByWeekday[index]
    const starterExercises = starter.exercises.map((exercise) => {
      const match = availableExercises.find((item) => item.name?.toLowerCase() === exercise.name.toLowerCase())
      return match ? { exercise: getId(match), sets: exercise.sets, reps: exercise.reps, restSeconds: exercise.rest } : null
    }).filter(Boolean)
    return { ...day, focus: source?.focus || starter.focus, isRestDay: source?.isRestDay ?? starter.isRestDay, exercises: source?.exercises?.map((item) => ({ ...item, exercise: typeof item.exercise === 'object' ? item.exercise._id || item.exercise.id : item.exercise })) || starterExercises }
  })
}
