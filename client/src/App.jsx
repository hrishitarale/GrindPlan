import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Dumbbell, Flame, Footprints, HeartPulse, House, Library, Menu, MoreHorizontal, Pencil, Play, Plus, Search, Settings2, Sparkles, Target, TrendingUp, Trophy, Trash2, Weight, X, Zap } from 'lucide-react'
import { libraryExercises, todayWorkout, warmup, weekPlan, workoutByWeekday } from './data/workouts.js'
import { api, authApi, getToken, setToken } from './api/client.js'
import AuthModal from './components/AuthModal.jsx'
import ProgressView from './components/ProgressView.jsx'
import HistoryView from './components/HistoryView.jsx'
import PlanManager from './components/PlanManager.jsx'

const iconMap = { Home: House, Plan: CalendarDays, Library, Progress: TrendingUp, History: Clock3 }
const navItems = ['Home', 'Plan', 'Library', 'Progress', 'History']
const prettyDate = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
const sessionStorageKey = new Date().toDateString()
function readSessionValue(key, fallback) {
  if (localStorage.getItem('grindplan-session-day') !== sessionStorageKey) {
    localStorage.setItem('grindplan-session-day', sessionStorageKey)
    ;['grindplan-completed', 'grindplan-sets', 'grindplan-set-inputs'].forEach((item) => localStorage.removeItem(item))
  }
  try { const value = localStorage.getItem(key); return value == null ? fallback : JSON.parse(value) } catch { return fallback }
}
function calculateStreak(logs) {
  const dateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  const dates = new Set(logs.map((log) => dateKey(new Date(log.date))))
  const cursor = new Date(); cursor.setHours(0, 0, 0, 0)
  if (!dates.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let count = 0
  while (dates.has(dateKey(cursor))) { count++; cursor.setDate(cursor.getDate() - 1) }
  return count
}

function App() {
  const [page, setPage] = useState('Home')
  const [dark, setDark] = useState(() => localStorage.getItem('grindplan-theme') !== 'light')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [completed, setCompleted] = useState(() => readSessionValue('grindplan-completed', false))
  const [setsDone, setSetsDone] = useState(() => readSessionValue('grindplan-sets', {}))
  const [setInputs, setSetInputs] = useState(() => readSessionValue('grindplan-set-inputs', {}))
  const [sessionStartedAt, setSessionStartedAt] = useState(() => localStorage.getItem('grindplan-session-start-day') === sessionStorageKey ? Number(localStorage.getItem('grindplan-session-start')) || null : null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [showFinish, setShowFinish] = useState(false)
  const [personalRecords, setPersonalRecords] = useState([])
  const [notice, setNotice] = useState('')
  const [weight, setWeight] = useState(() => localStorage.getItem('grindplan-weight') || '72.4')
  const [showSettings, setShowSettings] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('grindplan-user') || 'null') } catch { return null } })
  const [cloudToday, setCloudToday] = useState(null)
  const [cloudPlans, setCloudPlans] = useState([])
  const [cloudLogs, setCloudLogs] = useState([])
  const [cloudStats, setCloudStats] = useState([])
  const [cloudExercises, setCloudExercises] = useState([])
  const [demoExercises, setDemoExercises] = useState(() => JSON.parse(localStorage.getItem('grindplan-demo-exercises') || 'null') || libraryExercises)
  const [localLogs, setLocalLogs] = useState(() => JSON.parse(localStorage.getItem('grindplan-local-logs') || '[]'))
  const [localStats, setLocalStats] = useState(() => JSON.parse(localStorage.getItem('grindplan-local-stats') || '[]'))
  const [streak, setStreak] = useState(0)
  const [apiError, setApiError] = useState('')

  const loadCloud = useCallback(async () => {
    if (!getToken()) return
    try {
      await authApi.me()
      let today = await api('/plans/today')
      if (!today.plan) {
        await api('/plans/starter', { method: 'POST', body: {} })
        today = await api('/plans/today')
      }
      const [plans, logs, streakResult, stats, exercises] = await Promise.all([api('/plans'), api('/logs'), api('/logs/streak'), api('/stats'), api('/exercises')])
      setCloudToday(today); setCloudPlans(plans); setCloudLogs(logs); setStreak(streakResult.streak); setCloudStats(stats); setCloudExercises(exercises); setApiError('')
      localStorage.setItem('grindplan-cloud-cache', JSON.stringify({ today, plans, logs, stats, exercises, streak: streakResult.streak }))
      const currentLog = logs.find((log) => new Date(log.date).toDateString() === new Date().toDateString())
      if (currentLog) setCompleted(true)
    } catch (error) {
      setApiError(`Sync unavailable: ${error.message}`)
      try { const cached = JSON.parse(localStorage.getItem('grindplan-cloud-cache') || 'null'); if (cached) { setCloudToday(cached.today); setCloudPlans(cached.plans || []); setCloudLogs(cached.logs || []); setCloudStats(cached.stats || []); setCloudExercises(cached.exercises || []); setStreak(cached.streak || 0) } } catch { /* discard invalid local cache */ }
      if (/authentication|required|expired|invalid/i.test(error.message)) { setToken(null); setUser(null); localStorage.removeItem('grindplan-user') }
    }
  }, [])

  useEffect(() => {
    if (!getToken()) return
    loadCloud()
  }, [loadCloud])

  useEffect(() => { localStorage.setItem('grindplan-completed', JSON.stringify(completed)) }, [completed])
  useEffect(() => { localStorage.setItem('grindplan-sets', JSON.stringify(setsDone)) }, [setsDone])
  useEffect(() => { localStorage.setItem('grindplan-set-inputs', JSON.stringify(setInputs)) }, [setInputs])
  useEffect(() => { localStorage.setItem('grindplan-weight', weight) }, [weight])
  useEffect(() => { localStorage.setItem('grindplan-local-logs', JSON.stringify(localLogs)) }, [localLogs])
  useEffect(() => { localStorage.setItem('grindplan-local-stats', JSON.stringify(localStats)) }, [localStats])
  useEffect(() => { localStorage.setItem('grindplan-demo-exercises', JSON.stringify(demoExercises)) }, [demoExercises])
  useEffect(() => { localStorage.setItem('grindplan-theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => {
    const reminder = user?.reminderTime || localStorage.getItem('grindplan-reminder')
    if (!reminder || !('Notification' in window) || Notification.permission !== 'granted') return
    const checkReminder = () => {
      const now = new Date(); const today = now.toISOString().slice(0, 10)
      if (`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` === reminder && localStorage.getItem('grindplan-reminded') !== today) {
        new Notification('GrindPlan workout reminder', { body: 'Your session is ready. Show up for yourself today.', icon: '/favicon.svg' }); localStorage.setItem('grindplan-reminded', today)
      }
    }
    const timer = window.setInterval(checkReminder, 30_000)
    return () => window.clearInterval(timer)
  }, [user?.reminderTime])

  const setCount = Object.values(setsDone).filter(Boolean).length
  const totalSets = todayWorkout.exercises.reduce((sum, item) => sum + item.sets, 0)
  const cloudDay = cloudToday?.day
  const activeLocalPlan = !user ? cloudPlans.find((item) => item.active) || cloudPlans[0] || (() => { try { return JSON.parse(localStorage.getItem('grindplan-local-plan') || 'null') } catch { return null } })() : null
  const localDay = activeLocalPlan?.days?.find((day) => day.dayOfWeek === new Date().getDay())
  const mapPlanDay = (day, isCloud) => ({ focus: day.focus, group: day.focus, isRestDay: day.isRestDay, exercises: (day.exercises || []).map((entry) => { const reference = entry.exercise; const id = typeof reference === 'object' ? reference._id || reference.id : reference; const source = (isCloud ? cloudExercises : demoExercises).find((item) => String(item._id || item.id) === String(id)) || (typeof reference === 'object' ? reference : {}); return { id: id || source.id, mongoId: isCloud ? id : undefined, name: source.name || 'Exercise', muscle: source.muscleGroup || source.muscle || '', equipment: source.equipment || '', videoUrl: source.videoUrl || '', instructions: (source.instructions || []).join?.(' ') || '', sets: entry.sets || 3, reps: entry.reps || '8–12', rest: entry.restSeconds || 90 } }) })
  const workout = cloudDay ? mapPlanDay(cloudDay, true) : localDay ? mapPlanDay(localDay, false) : workoutByWeekday[(new Date().getDay() + 6) % 7]
  const workoutTotalSets = workout.exercises.reduce((sum, item) => sum + item.sets, 0)
  const activeStats = user ? cloudStats : localStats
  const activeLogs = user ? cloudLogs : localLogs
  const lastWeight = [...activeStats].reverse().find((item) => item.weight != null)?.weight ?? user?.currentWeight ?? weight
  const monthLogs = activeLogs.filter((item) => { const date = new Date(item.date); const now = new Date(); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() }).length
  const todayIndex = (new Date().getDay() + 6) % 7
  const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - todayIndex)
  const weekActivity = Array.from({ length: 7 }, (_, index) => { const day = new Date(weekStart); day.setDate(day.getDate() + index); return activeLogs.some((log) => new Date(log.date).toDateString() === day.toDateString()) || (index === todayIndex && completed) })
  const startingWeight = activeStats.find((item) => item.weight != null)?.weight ?? user?.currentWeight
  const goalPercent = startingWeight && user?.targetWeight && startingWeight !== user.targetWeight ? Math.max(0, Math.min(100, Math.round(Math.abs((startingWeight - Number(lastWeight)) / (startingWeight - user.targetWeight)) * 100))) : 0
  const planForUI = user ? cloudPlans.find((item) => item.active) || cloudPlans[0] : activeLocalPlan
  const nextDayOfWeek = (new Date().getDay() + 1) % 7
  const nextPlanSource = planForUI?.days?.find((item) => item.dayOfWeek === nextDayOfWeek)
  const nextPlanDisplay = nextPlanSource ? { ...weekPlan[(todayIndex + 1) % 7], focus: nextPlanSource.focus, group: nextPlanSource.isRestDay ? 'Mobility · Recovery' : nextPlanSource.focus, state: nextPlanSource.isRestDay ? 'rest' : 'upcoming' } : weekPlan[(todayIndex + 1) % 7]
  const avatarInitials = user?.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'JD'
  const progress = completed ? 100 : Math.round((setCount / totalSets) * 100)
  const filteredExercises = useMemo(() => demoExercises.filter((exercise) => {
    const matchesSearch = `${exercise.name} ${exercise.muscle} ${exercise.equipment}`.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'All' || exercise.muscle.toLowerCase().includes(filter.toLowerCase())
    return matchesSearch && matchesFilter
  }), [search, filter, demoExercises])

  function toggleSet(id) {
    if (!sessionStartedAt) { const start = Date.now(); setSessionStartedAt(start); localStorage.setItem('grindplan-session-start-day', sessionStorageKey); localStorage.setItem('grindplan-session-start', String(start)) }
    setSetsDone((current) => ({ ...current, [id]: !current[id] }))
  }

  async function finishWorkout() {
    if (completed) return
    const duration = sessionStartedAt ? Math.max(1, Math.round((Date.now() - sessionStartedAt) / 60_000)) : 1
    const records = workout.exercises.flatMap((exercise) => {
      const nameOf = (item) => typeof item.exercise === 'string' ? item.exercise : item.exercise?._id || item.exercise?.name
      const previous = activeLogs.flatMap((log) => (log.completedExercises || []).filter((item) => nameOf(item) === exercise.mongoId || nameOf(item) === exercise.name).flatMap((item) => item.sets || [])).reduce((best, set) => Math.max(best, Number(set.weight || 0)), 0)
      const next = Math.max(...Array.from({ length: exercise.sets }, (_, index) => Number(setInputs[`${exercise.id}-${index}`]?.weight || 0)))
      return next > previous && next > 0 ? [exercise.name] : []
    })
    setPersonalRecords(records)
    if (getToken() && cloudDay && !cloudDay.isRestDay) {
      try {
        await api('/logs', { method: 'POST', body: { date: new Date().toISOString(), dayFocus: cloudDay.focus, duration, notes: records.length ? `Personal record: ${records.join(', ')}` : '', completedExercises: workout.exercises.map((exercise) => ({ exercise: exercise.mongoId, sets: Array.from({ length: exercise.sets }, (_, index) => { const entry = setInputs[`${exercise.id}-${index}`] || {}; return { reps: Number(entry.reps || String(exercise.reps).match(/\d+/)?.[0] || 0), weight: Number(entry.weight || 0), done: true } }) })) } })
        await loadCloud()
      } catch (error) { setApiError(`Could not save workout: ${error.message}`); return }
    } else setLocalLogs((logs) => [{ _id: `local-${Date.now()}`, date: new Date().toISOString(), dayFocus: workout.focus, duration, notes: records.length ? `Personal record: ${records.join(', ')}` : '', completedExercises: workout.exercises.map((exercise) => ({ exercise: { name: exercise.name }, sets: Array.from({ length: exercise.sets }, (_, i) => { const entry = setInputs[`${exercise.id}-${i}`] || {}; return { reps: Number(entry.reps || String(exercise.reps).match(/\d+/)?.[0] || 0), weight: Number(entry.weight || 0), done: true } }) })) }, ...logs])
    setCompleted(true); setShowFinish(true)
  }

  function notify(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2400)
  }

  function navigate(nextPage) { setPage(nextPage); setMobileMenu(false) }

  return <div className={dark ? 'app' : 'app light'}>
    <aside className="sidebar">
      <Brand />
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav">{navItems.map((item) => <NavButton key={item} item={item} active={page === item} onClick={() => navigate(item)} />)}</nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tip"><div className="tip-icon"><Sparkles size={16} /></div><span className="tip-eyebrow">A LITTLE REMINDER</span><p>Progress is built one session at a time.</p><span className="tip-sparkle">✳ &nbsp; Keep showing up.</span></div>
        <button className="sidebar-profile" onClick={() => setShowSettings(true)}><div className="avatar">{avatarInitials}</div><div className="profile-copy"><b>{user?.name || 'Guest athlete'}</b><span>{user?.goal || 'Keep getting stronger'}</span></div><MoreHorizontal size={18} /></button>
      </div>
    </aside>

    <div className="mobile-header"><button className="icon-button" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></button><Brand /><button className="icon-button" onClick={() => setShowSettings(true)}><Settings2 size={19} /></button></div>
    <AnimatePresence>{mobileMenu && <motion.div className="mobile-drawer" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}><Brand />{navItems.map((item) => <NavButton key={item} item={item} active={page === item} onClick={() => navigate(item)} />)}</motion.div>}</AnimatePresence>

    <main className="main-area">
      <header className="topbar"><div className="crumbs"><span>YOUR SPACE</span><ChevronRight size={13} /><b>{page === 'Home' ? 'Today' : page}</b></div><div className="top-actions"><span className="today-date">{prettyDate}</span><button className="icon-button notification-button" aria-label="Notifications" onClick={() => notify('You’re all caught up.') }><Bell size={17} /><i /></button><button className="icon-button" aria-label="Settings" onClick={() => setShowSettings(true)}><Settings2 size={17} /></button></div></header>
      <div className="mobile-date">{prettyDate}</div>
      <div className="page-content" key={page}>
        {apiError && <div className="api-banner"><CircleHelp size={15} />{apiError}</div>}
        {page === 'Home' && <Dashboard completed={completed} progress={completed ? 100 : Math.round(setCount / Math.max(workoutTotalSets, 1) * 100)} setCount={setCount} totalSets={workoutTotalSets} setsDone={setsDone} setInputs={setInputs} setSetInputs={setSetInputs} workout={workout} streak={user ? streak : calculateStreak(localLogs)} weekActivity={weekActivity} nextPlanDay={nextPlanDisplay} isGuest={!user} initials={avatarInitials} weight={lastWeight} units={user?.units || localStorage.getItem('grindplan-units') || 'kg'} monthCount={monthLogs} goalProgress={goalPercent} onToggleSet={toggleSet} onFinish={finishWorkout} onNavigate={navigate} onSettings={() => setShowSettings(true)} />}
        {page === 'Plan' && <PlanManager onStart={() => navigate('Home')} availableExercises={user && cloudExercises.length ? cloudExercises : demoExercises} plan={cloudPlans.find((item) => item.active) || cloudPlans[0] || JSON.parse(localStorage.getItem('grindplan-local-plan') || 'null')} onSave={async (plan) => { if (!user) { const localPlan = { ...plan, _id: 'local-plan' }; localStorage.setItem('grindplan-local-plan', JSON.stringify(localPlan)); setCloudPlans([localPlan]); return localPlan } try { const saved = plan._id && plan._id !== 'local-plan' ? await api(`/plans/${plan._id}`, { method: 'PUT', body: Object.fromEntries(Object.entries(plan).filter(([key]) => key !== '_id')) }) : await api('/plans', { method: 'POST', body: Object.fromEntries(Object.entries(plan).filter(([key]) => key !== '_id')) }); setCloudPlans((items) => [saved, ...items.filter((item) => item._id !== saved._id)]); await loadCloud(); return saved } catch (error) { setApiError(error.message); throw error } }} />}
        {page === 'Library' && <LibraryPage search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} exercises={user && cloudExercises.length ? cloudExercises.map((item) => ({ ...item, id: item._id, muscle: item.muscleGroup?.toUpperCase() || '', sets: item.sets || 3, reps: item.reps || '8–12' })).filter((item) => `${item.name} ${item.muscle} ${item.equipment}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'All' || item.muscle.toLowerCase().includes(filter.toLowerCase()))) : filteredExercises} onCreate={async (body) => { if (!user) { setDemoExercises((items) => [...items, { ...body, id: `custom-${Date.now()}`, muscle: body.muscleGroup.toUpperCase(), sets: 3, reps: '8–12' }]); return } try { const item = await api('/exercises', { method: 'POST', body }); setCloudExercises((items) => [...items, item]) } catch (error) { setApiError(error.message) } }} onUpdate={async (id, body) => { if (!user) { setDemoExercises((items) => items.map((item) => item.id === id ? { ...item, ...body, muscle: body.muscleGroup.toUpperCase() } : item)); return } try { const item = await api(`/exercises/${id}`, { method: 'PUT', body }); setCloudExercises((items) => items.map((row) => row._id === id ? item : row)) } catch (error) { setApiError(error.message) } }} onDelete={async (id) => { if (!user) { setDemoExercises((items) => items.filter((item) => item.id !== id)); return } try { await api(`/exercises/${id}`, { method: 'DELETE' }); setCloudExercises((items) => items.filter((item) => item._id !== id)) } catch (error) { setApiError(error.message) } }} />}
        {page === 'Progress' && <ProgressView stats={user ? cloudStats : localStats} logs={user ? cloudLogs : localLogs} units={user?.units || localStorage.getItem('grindplan-units') || 'kg'} onSave={async (body) => { if (!user) { const item = { ...body, date: new Date().toISOString(), _id: `local-${Date.now()}` }; setLocalStats((items) => [...items, item]); if (body.weight) setWeight(body.weight); return } await api('/stats', { method: 'POST', body }); await loadCloud() }} />}
        {page === 'History' && <HistoryView logs={user ? cloudLogs : localLogs} />}
      </div>
    </main>
    <nav className="bottom-nav">{navItems.map((item) => { const Icon = iconMap[item]; return <button key={item} onClick={() => navigate(item)} className={page === item ? 'bottom-link active' : 'bottom-link'}><Icon size={19} /><span>{item}</span></button> })}</nav>
    <AnimatePresence>{showFinish && <FinishModal totalSets={workoutTotalSets} duration={sessionStartedAt ? Math.max(1, Math.round((Date.now() - sessionStartedAt) / 60_000)) : 1} personalRecords={personalRecords} onClose={() => setShowFinish(false)} onNavigate={() => { setShowFinish(false); navigate('Progress') }} />}</AnimatePresence>
    <AnimatePresence>{showFinish && personalRecords.length > 0 && <motion.div className="pr-toast" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}><Trophy size={16} /> New personal record{personalRecords.length > 1 ? 's' : ''}: {personalRecords.join(', ')}</motion.div>}</AnimatePresence>
    <AnimatePresence>{showSettings && <SettingsModal dark={dark} setDark={setDark} user={user} onSignIn={() => { setShowSettings(false); setShowAuth(true) }} onSignOut={() => { setToken(null); setUser(null); localStorage.removeItem('grindplan-user'); localStorage.removeItem('grindplan-cloud-cache'); setCloudToday(null); setCloudPlans([]); setCloudLogs([]); setCloudStats([]); setCloudExercises([]); setShowSettings(false); setCompleted(false); setSetsDone({}); setSetInputs({}) }} onSaveProfile={async (updates) => { const result = await api('/auth/me', { method: 'PUT', body: updates }); setUser(result.user); localStorage.setItem('grindplan-user', JSON.stringify(result.user)) }} onClose={() => setShowSettings(false)} />}</AnimatePresence>
    <AnimatePresence>{showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuthenticated={async (authenticatedUser) => { setUser(authenticatedUser); localStorage.setItem('grindplan-user', JSON.stringify(authenticatedUser)); setCompleted(false); setSetsDone({}); setSetInputs({}); await loadCloud() }} />}</AnimatePresence>
    <AnimatePresence>{notice && <motion.div className="toast" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}><CheckCircle2 size={16} />{notice}</motion.div>}</AnimatePresence>
  </div>
}

function Brand() { return <div className="brand"><div className="brand-mark"><Dumbbell size={19} strokeWidth={2.5} /></div><span>grind<span className="brand-accent">plan</span></span><span className="brand-period">.</span></div> }

function NavButton({ item, active, onClick }) {
  const Icon = iconMap[item] || House
  return <button onClick={onClick} className={active ? 'nav-link active' : 'nav-link'}><Icon size={18} strokeWidth={active ? 2.2 : 1.8} /><span>{item}</span>{item === 'Home' && <span className="nav-dot" />}</button>
}

function Dashboard({ completed, progress, setCount, totalSets, setsDone, setInputs, setSetInputs, workout = todayWorkout, streak = 0, weekActivity = [], nextPlanDay, isGuest, initials, weight, units, monthCount, goalProgress, onToggleSet, onFinish, onNavigate, onSettings }) {
  const todayIndex = (new Date().getDay() + 6) % 7
  const todayPlanDay = weekPlan[todayIndex]
  const nextDay = nextPlanDay || weekPlan[(todayIndex + 1) % 7]
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> YOUR DAILY CHECK-IN</div><h1>MAKE TODAY <span>COUNT.</span></h1><p className="page-subtitle">A little stronger than yesterday. That’s the goal.</p></div><button className="avatar top-avatar" onClick={onSettings} aria-label="Open profile">{initials}</button></div>
    <div className="dashboard-grid">
      <section className="today-card"><div className="today-card-top"><div className="today-label"><span className="today-icon"><Dumbbell size={16} /></span>{workout.isRestDay ? 'TODAY’S RECOVERY' : 'TODAY’S SESSION'}</div><span className={completed ? 'status-pill completed-pill' : 'status-pill'}><span />{completed ? 'COMPLETED' : workout.isRestDay ? 'REST & RESET' : 'READY WHEN YOU ARE'}</span></div>
        <div className="workout-title-row"><div><span className="focus-label">{todayPlanDay.day} · {(workout.group || todayPlanDay.group).toUpperCase()}</span><h2>{completed ? `${workout.focus}. Done.` : workout.focus.toUpperCase()}</h2><div className="workout-tags"><span><Clock3 size={13} /> {workout.isRestDay ? 'Take it easy' : '50–70 min'}</span><i /> <span><Flame size={13} /> {workout.isRestDay ? 'Recovery matters' : 'Moderate intensity'}</span></div></div><div className="session-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-core"><Dumbbell size={42} /></div><span className="art-spark spark-a">✳</span><span className="art-spark spark-b">·</span></div></div>
        <div className="workout-progress"><div className="progress-copy"><span>SESSION PROGRESS</span><b>{completed ? 'All done!' : `${setCount} of ${totalSets} sets`}</b></div><div className="progress-track"><div style={{ width: `${progress}%` }} /></div><span className="progress-percent">{progress}%</span></div>
        <div className="section-rule" />
        {!workout.isRestDay ? <><div className="exercise-header"><div><span className="section-kicker">THE LINEUP</span><h3>Today’s exercises <span>{workout.exercises.length}</span></h3></div><button className="text-button" onClick={() => onNavigate('Plan')}>View plan <ArrowRight size={14} /></button></div>
        <div className="exercise-list">{workout.exercises.map((exercise, index) => <ExerciseRow key={exercise.id || index} exercise={exercise} index={index} checkedCount={Array.from({ length: exercise.sets }, (_, i) => setsDone[`${exercise.id}-${i}`]).filter(Boolean).length} setsDone={setsDone} setInputs={setInputs} onSetInput={(id, field, value) => setSetInputs((current) => ({ ...current, [id]: { ...current[id], [field]: value } }))} done={completed} onToggleSet={onToggleSet} />)}</div>
        <WarmupPanel />
        <button onClick={onFinish} disabled={completed} className={completed ? 'finish-button done-button' : 'finish-button'}>{completed ? <><Check size={18} /> SESSION COMPLETE</> : <><CheckCircle2 size={18} /> MARK WORKOUT AS DONE <ArrowRight size={17} /></>}</button></> : <div className="recovery-panel"><span className="section-kicker">RECOVERY COUNTS, TOO</span><h3>Give your body a little room.</h3><ul><li>Take a relaxed 20-minute walk.</li><li>Try gentle hip, hamstring, and back stretches.</li><li>Drink water, get a good meal, and sleep well.</li></ul></div>}
        <p className="button-note">Every rep counts. You showed up today.</p>
      </section>

    <aside className="right-column"><div className="streak-card"><div className="streak-top"><div><span className="section-kicker">MOMENTUM LOOKS GOOD</span><h3>You’re on a roll.</h3></div><div className="streak-flame"><Flame size={20} fill="currentColor" /></div></div><div className="streak-number"><strong>{String(streak).padStart(2, '0')}</strong><span>DAY<br />STREAK</span><span className="streak-glyph">✳</span></div><div className="week-dots">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <div key={`${day}${i}`} className={weekActivity[i] ? 'week-day done' : i === todayIndex ? 'week-day current' : 'week-day'}><span>{weekActivity[i] ? <Check size={13} /> : day}</span><i>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</i></div>)}</div><div className="streak-footer"><Flame size={14} /> {isGuest ? 'Sign in to keep your streak backed up' : 'Current consecutive workout streak'} <b>{streak}</b></div></div>
        <div className="quick-stats"><div className="side-heading"><div><span className="section-kicker">THE BIG PICTURE</span><h3>Quick stats</h3></div><button className="round-arrow" onClick={() => onNavigate('Progress')} aria-label="See progress"><ArrowUpRight size={16} /></button></div><div className="stat-row"><div className="stat-icon lime-icon"><Weight size={16} /></div><div className="stat-text"><span>BODY WEIGHT</span><strong>{weight || '—'} <small>{units}</small></strong></div><span className="stat-change positive">{weight ? 'LATEST' : 'LOG'}</span></div><div className="stat-row"><div className="stat-icon orange-icon"><Activity size={16} /></div><div className="stat-text"><span>WORKOUTS THIS MONTH</span><strong>{monthCount} <small>sessions</small></strong></div><span className="stat-change positive"><ArrowUpRight size={13} /></span></div><div className="stat-row"><div className="stat-icon blue-icon"><Target size={16} /></div><div className="stat-text"><span>GOAL PROGRESS</span><strong>{goalProgress} <small>%</small></strong></div><span className="mini-progress"><i style={{ width: `${goalProgress}%` }} /></span></div><button className="stats-link" onClick={() => onNavigate('Progress')}>See your progress <ArrowRight size={14} /></button></div>
        <div className="next-card"><div className="next-head"><span className="section-kicker">UP NEXT</span><span className="next-day">{nextDay.day} · TOMORROW</span></div><div className="next-main"><div className="next-icon">{nextDay.state === 'rest' ? <HeartPulse size={19} /> : <Dumbbell size={18} />}</div><div><b>{nextDay.focus}</b><span>{nextDay.group}</span></div><ChevronRight size={17} /></div><div className="next-foot"><span className="tomorrow-dot" /> {nextDay.state === 'rest' ? 'Rest is part of the plan. Let it count.' : 'A fresh session is waiting for you.'}</div></div>
      </aside>
    </div>
    <div className="quote-strip"><span>✳</span><p>“You don’t have to be extreme, just <b>consistent.</b>”</p><span className="quote-credit">A NOTE TO YOURSELF</span></div>
  </>
}

function ExerciseRow({ exercise, index, checkedCount, setsDone, setInputs, onSetInput, done, onToggleSet }) {
  const [expanded, setExpanded] = useState(false)
  const allChecked = done || checkedCount >= exercise.sets
  return <div className={allChecked ? 'exercise-row row-done' : 'exercise-row'}><div className="exercise-main"><div className={allChecked ? 'exercise-number checked-number' : 'exercise-number'}>{allChecked ? <Check size={15} /> : String(index + 1).padStart(2, '0')}</div><div className="exercise-copy"><button className="exercise-name" onClick={() => setExpanded(!expanded)}>{exercise.name}<ChevronDown size={13} className={expanded ? 'chevron rotated' : 'chevron'} /></button><span className="exercise-muscle">{exercise.muscle}</span></div><div className="exercise-target"><strong>{exercise.sets} × {exercise.reps}</strong><span>SETS × REPS</span></div><button className={exercise.videoUrl ? 'video-button' : 'video-button disabled'} title={exercise.videoUrl || 'Add a video link in client/src/data/workouts.js'} onClick={() => exercise.videoUrl && setExpanded(!expanded)}><Play size={13} fill={exercise.videoUrl ? 'currentColor' : 'none'} /></button></div>
    <div className="set-tracker"><span className="tracker-label">LOG SETS</span>{Array.from({ length: exercise.sets }, (_, i) => { const id = `${exercise.id}-${i}`; const checked = done || Boolean(setsDone[id]); return <button key={id} className={checked ? 'set-chip set-checked' : 'set-chip'} onClick={() => onToggleSet(id)} title={`Log set ${i + 1}`} aria-label={`Set ${i + 1}${checked ? ', completed' : ''}`}>{checked ? <Check size={11} /> : i + 1}</button> })}<span className="rest-label"><Clock3 size={11} /> {exercise.rest}s rest</span></div>
    {expanded && <div className="exercise-expanded"><span>{exercise.equipment} · LOG EACH SET</span>{exercise.videoUrl && youtubeEmbed(exercise.videoUrl) && <iframe className="exercise-video" src={youtubeEmbed(exercise.videoUrl)} title={`${exercise.name} video`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />}<div className="set-input-list">{Array.from({ length: exercise.sets }, (_, i) => { const id = `${exercise.id}-${i}`; const entry = setInputs[id] || {}; const checked = done || Boolean(setsDone[id]); return <div className="set-input-row" key={id}><span>SET {i + 1}</span><label>REPS<input type="number" min="0" placeholder={String(exercise.reps).match(/\d+/)?.[0] || '10'} value={entry.reps || ''} onChange={(e) => onSetInput(id, 'reps', e.target.value)} /></label><label>WEIGHT<input type="number" min="0" step="0.5" placeholder="0" value={entry.weight || ''} onChange={(e) => onSetInput(id, 'weight', e.target.value)} /></label><button className={checked ? 'set-chip set-checked' : 'set-chip'} onClick={() => onToggleSet(id)}>{checked ? <Check size={11} /> : '✓'}</button></div> })}</div><p>{exercise.instructions || 'Form first. Keep every rep controlled and steady.'}</p>{exercise.videoUrl ? <a href={exercise.videoUrl} target="_blank" rel="noreferrer">Watch exercise <ArrowRight size={13} /></a> : <span className="video-placeholder">Video link can be added later</span>}</div>}
  </div>
}

function WarmupPanel() {
  return <section className="content-card" style={{ marginTop: 20, padding: 20 }}>
    <div className="content-card-head"><div><span className="section-kicker">BEFORE EVERY WORKOUT · {warmup.estimatedMinutes} MIN</span><h3>{warmup.title}</h3></div><a href={warmup.videoUrl} target="_blank" rel="noreferrer">Watch warm-up <ArrowRight size={13} /></a></div>
    <p>{warmup.note}</p>
    <div className="exercise-list">{warmup.exercises.map((exercise) => <div className="exercise-row" key={exercise.order}><div className="exercise-main"><div className="exercise-number">{String(exercise.order).padStart(2, '0')}</div><div className="exercise-copy"><a className="exercise-name" href={exercise.videoUrl} target="_blank" rel="noreferrer">{exercise.name} <Play size={12} /></a><span className="exercise-muscle">{exercise.targetArea}</span></div><div className="exercise-target"><strong>{exercise.start}–{exercise.end}</strong><span>VIDEO TIMESTAMP</span></div></div><p>{exercise.notes}</p></div>)}</div>
    <p>Finish with 1–2 light ramp-up sets of your first exercise.</p>
    <details><summary>Optional mobility add-ons</summary><p>{warmup.additionalExercises.map((exercise) => `${exercise.name} (${exercise.notes})`).join(' · ')}</p></details>
  </section>
}

function youtubeEmbed(url) {
  try { const parsed = new URL(url); const id = parsed.hostname.includes("youtu.be") ? parsed.pathname.slice(1) : parsed.searchParams.get("v") || parsed.pathname.match(/\/embed\/([^/]+)/)?.[1]; const start = parsed.searchParams.get('t'); return id ? `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${Number.parseInt(start, 10) || 0}` : ''}` : null } catch { return null }
}
function PageHero({ eyebrow, title, accent, subtitle, action }) { return <div className="page-heading secondary-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title} <span>{accent}</span></h1><p className="page-subtitle">{subtitle}</p></div>{action}</div> }

function PlanPage({ onStart, plan, onSave }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(plan?.title || 'My weekly plan')
  const [schedule, setSchedule] = useState(() => weekPlan.map((item, i) => ({ ...item, dayOfWeek: (i + 1) % 7, isRestDay: item.state === 'rest', exercises: [] })))
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!plan?.days) return
    setTitle(plan.title)
    setSchedule(weekPlan.map((item, i) => { const dayOfWeek = (i + 1) % 7; const serverDay = plan.days.find((day) => day.dayOfWeek === dayOfWeek); return { ...item, dayOfWeek, focus: serverDay?.focus || item.focus, isRestDay: Boolean(serverDay?.isRestDay), exercises: serverDay?.exercises || [] } }))
  }, [plan])
  async function savePlan() {
    setSaving(true)
    try { await onSave({ ...(plan || {}), title, active: true, days: schedule.map(({ dayOfWeek, focus, isRestDay, exercises }) => ({ dayOfWeek, focus, isRestDay, exercises: isRestDay ? [] : exercises })) }); setEditing(false) }
    finally { setSaving(false) }
  }
  const todayOfWeek = (new Date().getDay() + 6) % 7
  return <><PageHero eyebrow="THE ROAD AHEAD" title="YOUR WEEK, " accent="YOUR PACE." subtitle="A flexible plan that moves with you. Show up when you can." action={<button className="primary-small" onClick={onStart}><Play size={14} fill="currentColor" /> Start today</button>} /><section className="content-card plan-card"><div className="content-card-head"><div><span className="section-kicker">{userPlanLabel(plan)}</span><h3>{plan?.title || 'Weekly training split'}</h3></div><button className="edit-button" onClick={() => setEditing(!editing)}>{editing ? 'Close editor' : 'Edit plan'} <ArrowRight size={14} /></button></div>{editing && <div className="plan-editor"><label>Plan name<input value={title} onChange={(e) => setTitle(e.target.value)} /></label><div className="plan-editor-grid">{schedule.map((day, i) => <label key={day.day}><span>{day.day}</span><input value={day.focus} onChange={(e) => setSchedule((rows) => rows.map((row, index) => index === i ? { ...row, focus: e.target.value } : row))} /><span className="rest-choice"><input type="checkbox" checked={day.isRestDay} onChange={(e) => setSchedule((rows) => rows.map((row, index) => index === i ? { ...row, isRestDay: e.target.checked } : row))} /> Recovery day</span></label>)}</div><button className="primary-small" onClick={savePlan} disabled={saving}>{saving ? 'Saving…' : 'Save weekly plan'} <Check size={14} /></button></div>}<div className="plan-week">{schedule.map((item, i) => { const state = i === todayOfWeek ? 'today' : item.isRestDay ? 'rest' : 'upcoming'; return <div key={item.day} className={`plan-day ${state === 'today' ? 'plan-today' : ''} ${state === 'rest' ? 'plan-rest' : ''}`}><div className="plan-day-top"><span>{item.day}</span>{state === 'today' && <i>TODAY</i>}</div><div className="plan-day-icon">{item.icon}</div><b>{item.focus}</b><span>{item.isRestDay ? 'Mobility · Recovery' : item.group}</span><div className="plan-day-bottom">{item.isRestDay ? <><HeartPulse size={12} /> Recovery</> : state === 'today' ? <><Flame size={12} /> Up next</> : <><Dumbbell size={12} /> Training</>}</div></div> })}</div><div className="plan-note"><span>✳</span><p><b>Rest is part of the plan.</b> Recovery days help your body come back stronger. Keep it light and listen to how you feel.</p></div></section><section className="content-card focus-card"><span className="section-kicker">TODAY’S FOCUS</span><h3>{schedule[todayOfWeek]?.focus || 'Training day'} · strength</h3><p>Move with control, choose weights that let you keep good form, and take your time on each rep.</p><button className="text-button" onClick={onStart}>See today’s workout <ArrowRight size={14} /></button></section></>
}

function userPlanLabel(plan) { return plan?._id ? 'ACTIVE PLAN · YOUR TRAINING' : 'SAMPLE PLAN · SIGN IN TO SAVE' }

function LibraryPage({ search, setSearch, filter, setFilter, exercises, onCreate, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const filters = ['All', 'Chest', 'Back', 'Quads', 'Glutes', 'Shoulders']
  return <><PageHero eyebrow="YOUR MOVEMENT TOOLKIT" title="EXERCISE " accent="LIBRARY." subtitle="Find your next move. Your form will thank you." action={<button className="primary-small" onClick={() => { setEditing(null); setShowEditor(true) }}><Plus size={14} /> Add exercise</button>} /><section className="content-card library-card"><div className="library-toolbar"><label className="search-box"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exercises, muscles, equipment…" /><kbd>⌘ K</kbd></label><button className="filter-toggle" onClick={() => setFilter(filter === 'All' ? 'Chest' : 'All')}><Settings2 size={15} /> Filters <ChevronDown size={13} /></button></div><div className="filter-chips">{filters.map((item) => <button key={item} className={filter === item ? 'filter-chip selected' : 'filter-chip'} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="library-grid">{exercises.map((exercise, i) => <div className="library-item" key={exercise.id || exercise._id}><div className={`library-art art-${i % 4}`}><Dumbbell size={27} /><span>{String(i + 1).padStart(2, '0')}</span></div><div className="library-item-copy"><span>{exercise.muscle || exercise.muscleGroup}</span><b>{exercise.name}</b><small>{exercise.equipment} <i /> {exercise.sets || 3} sets · {exercise.reps || '8–12'} reps</small></div><button className="library-edit" aria-label={`Edit ${exercise.name}`} onClick={() => { setEditing(exercise); setShowEditor(true) }}><Pencil size={13} /></button><button className="library-delete" aria-label={`Delete ${exercise.name}`} onClick={() => onDelete(exercise.id || exercise._id)}><Trash2 size={13} /></button></div>)}</div>{exercises.length === 0 && <div className="empty-state"><Search size={21} /><b>No movements found</b><span>Try another search or muscle group.</span></div>}</section><AnimatePresence>{showEditor && <ExerciseEditor exercise={editing} onClose={() => setShowEditor(false)} onSave={async (body) => { if (editing) await onUpdate(editing.id || editing._id, body); else await onCreate(body); setShowEditor(false) }} />}</AnimatePresence></>
}

function ExerciseEditor({ exercise, onClose, onSave }) {
  const [form, setForm] = useState({ name: exercise?.name || '', muscleGroup: exercise?.muscleGroup || exercise?.muscle || '', equipment: exercise?.equipment || 'Bodyweight', difficulty: exercise?.difficulty || 'beginner', videoUrl: exercise?.videoUrl || '', instructions: Array.isArray(exercise?.instructions) ? exercise.instructions.join('\n') : '', tips: Array.isArray(exercise?.tips) ? exercise.tips.join('\n') : '' })
  const [saving, setSaving] = useState(false)
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  async function submit(event) { event.preventDefault(); setSaving(true); try { await onSave({ ...form, instructions: form.instructions.split('\n').filter(Boolean), tips: form.tips.split('\n').filter(Boolean) }) } finally { setSaving(false) } }
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.form className="exercise-editor-modal" onSubmit={submit} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.stopPropagation()}><button type="button" className="modal-close" onClick={onClose}><X size={17} /></button><span className="section-kicker">YOUR MOVEMENT TOOLKIT</span><h3>{exercise ? 'Edit exercise' : 'Add an exercise'}</h3><label>Exercise name<input required value={form.name} onChange={(e) => change('name', e.target.value)} /></label><div className="editor-fields"><label>Muscle group<input required value={form.muscleGroup} onChange={(e) => change('muscleGroup', e.target.value)} placeholder="Chest, Triceps" /></label><label>Equipment<input value={form.equipment} onChange={(e) => change('equipment', e.target.value)} /></label></div><div className="editor-fields"><label>Difficulty<select value={form.difficulty} onChange={(e) => change('difficulty', e.target.value)}><option>beginner</option><option>intermediate</option><option>advanced</option></select></label><label>Video URL<input type="url" value={form.videoUrl} onChange={(e) => change('videoUrl', e.target.value)} placeholder="https://…" /></label></div><label>Instructions <small>One per line</small><textarea rows="2" value={form.instructions} onChange={(e) => change('instructions', e.target.value)} /></label><label>Tips <small>One per line</small><textarea rows="2" value={form.tips} onChange={(e) => change('tips', e.target.value)} /></label><button className="auth-submit" disabled={saving}>{saving ? 'SAVING…' : 'SAVE EXERCISE'} <Check size={15} /></button></motion.form></motion.div>
}

function ProgressPage({ weight, setWeight, stats = [], logs = [], isGuest, units = 'kg', onSaveStat }) {
  const latest = stats.at(-1)
  const currentWeight = latest?.weight ?? weight
  const [draft, setDraft] = useState(String(currentWeight))
  const [measurements, setMeasurements] = useState({ bodyFat: '', chest: '', waist: '', arms: '', thighs: '' })
  const [saved, setSaved] = useState(false)
  const chartRows = stats.filter((item) => item.weight).slice(-12)
  const chartValues = chartRows.length ? chartRows.map((item) => Number(item.weight)) : [72.9, 72.8, 72.7, 72.5, 72.6, 72.4]
  const min = Math.min(...chartValues); const max = Math.max(...chartValues); const spread = max - min || 1
  const heights = chartValues.map((value) => Math.max(12, 28 + ((value - min) / spread) * 65))
  const volume = logs.map((log) => ({ date: new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: (log.completedExercises || []).reduce((sum, item) => sum + (item.sets || []).reduce((subtotal, set) => subtotal + Number(set.weight || 0) * Number(set.reps || 0), 0), 0) })).slice(-10)
  async function saveWeight() { await onSaveStat({ weight: Number(draft) }); if (isGuest) setWeight(draft); setSaved(true); window.setTimeout(() => setSaved(false), 2200) }
  async function saveMeasurements(event) { event.preventDefault(); await onSaveStat({ ...measurements, weight: draft ? Number(draft) : undefined }); setMeasurements({ bodyFat: '', chest: '', waist: '', arms: '', thighs: '' }); setSaved(true); window.setTimeout(() => setSaved(false), 2200) }
  return <><PageHero eyebrow="SMALL WINS ADD UP" title="LOOK HOW FAR " accent="YOU’VE COME." subtitle="Progress is more than the number on the scale." action={<span className="period-select">ALL TIME <ChevronDown size={13} /></span>} /><div className="progress-summary"><div className="summary-card lime-summary"><span>WORKOUTS LOGGED</span><b>{logs.length || 0} <small>sessions</small></b><i><TrendingUp size={13} /> Your work, adding up</i><div className="summary-sparkline">▁ ▃ ▂ ▅ ▃ ▆ ▄ ▇</div></div><div className="summary-card"><span>BODY WEIGHT</span><b>{currentWeight} <small>kg</small></b><i><Weight size={13} /> Latest check-in</i><div className="summary-sparkline orange-spark">▆ ▇ ▅ ▆ ▃ ▅ ▂ ▄</div></div><div className="summary-card"><span>MEASUREMENTS</span><b>{stats.length} <small>check-ins</small></b><i><Activity size={13} /> Body stats logged</i><div className="summary-sparkline blue-spark">▂ ▄ ▃ ▅ ▆ ▄ ▇ ▅</div></div></div><div className="progress-layout"><section className="content-card chart-card"><div className="content-card-head"><div><span className="section-kicker">BODY WEIGHT TREND</span><h3>Weight over time</h3></div><span className="chart-legend"><i /> {chartRows.length ? 'Your check-ins' : 'Sample trend'}</span></div><div className="chart-area"><div className="chart-y"><span>{(max + spread * .2).toFixed(1)}</span><span>{(max).toFixed(1)}</span><span>{((max + min) / 2).toFixed(1)}</span><span>{min.toFixed(1)}</span></div><div className="chart-main"><div className="chart-guides"><i /><i /><i /><i /></div><div className="bar-chart">{heights.map((height, i) => <div className="chart-bar-wrap" key={i}><div className={i === heights.length - 1 ? 'chart-bar bar-highlight' : 'chart-bar'} style={{ height: `${height}%` }} title={`${chartValues[i]} kg`} />{(i === 0 || i === heights.length - 1 || (chartRows.length > 5 && i % 3 === 0)) && <span>{chartRows[i] ? new Date(chartRows[i].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `Entry ${i + 1}`}</span>}</div>)}</div></div></div><div className="volume-heading"><span className="section-kicker">STRENGTH</span><b>Logged training volume</b></div>{volume.length ? <div className="volume-list">{volume.map((item, i) => <div key={i}><span>{item.date} · {logs[logs.length - volume.length + i]?.dayFocus || 'Workout'}</span><b>{item.value.toLocaleString()} kg·reps</b></div>)}</div> : <p className="chart-empty">Complete and log a workout to see your training volume here.</p>}</section><section className="content-card weight-card"><div className="content-card-head"><div><span className="section-kicker">YOUR LATEST CHECK-IN</span><h3>Body measurements</h3></div><Weight size={17} className="muted-icon" /></div><div className="weight-current"><b>{currentWeight}</b><span>kg</span><small>{chartRows.length} weight entries</small></div><div className="weight-mini-chart">{heights.slice(-12).map((height, i) => <i key={i} className={i === heights.length - 1 ? 'mini-bar current' : 'mini-bar'} style={{ height: `${height}%` }} />)}</div><div className="weight-chart-dates"><span>{chartRows[0] ? new Date(chartRows[0].date).toLocaleDateString() : 'First entry'}</span><span>{chartRows.at(-1) ? new Date(chartRows.at(-1).date).toLocaleDateString() : 'Latest entry'}</span></div><form className="measurement-form" onSubmit={saveMeasurements}><label className="measurement-title">LOG BODY STATS ({user?.units?.toUpperCase() || 'KG'})</label><div className="measurement-grid">{[['weight','Weight'],['bodyFat','Body fat %'],['chest','Chest'],['waist','Waist'],['arms','Arms'],['thighs','Thighs']].map(([key,label]) => <label key={key}>{label}<input required={key === 'weight'} type="number" min="0" step="0.1" value={key === 'weight' ? draft : measurements[key]} onChange={(e) => key === 'weight' ? setDraft(e.target.value) : setMeasurements((current) => ({ ...current, [key]: e.target.value }))} /></label>)}</div><button className="measurement-save">{saved ? 'SAVED' : 'SAVE CHECK-IN'} <Check size={14} /></button></form></section></div></>
}

function HistoryPage({ completed, logs = [], isGuest }) {
  const now = new Date()
  const [selectedDay, setSelectedDay] = useState(now.getDate())
  const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(now)
  const weekdayName = (day) => new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date(now.getFullYear(), now.getMonth(), day))
  const offset = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7
  const monthLength = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const visibleLogs = logs.filter((log) => { const date = new Date(log.date); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() })
  const workoutDays = new Set(visibleLogs.map((log) => new Date(log.date).getDate()))
  if (isGuest && completed) workoutDays.add(now.getDate())
  const days = Array.from({ length: Math.ceil((offset + monthLength) / 7) * 7 }, (_, i) => {
    const date = i - offset + 1
    return { date: date > 0 && date <= monthLength ? date : null, workout: workoutDays.has(date) || (date === now.getDate() && completed) }
  })
  const selectedLog = visibleLogs.find((log) => new Date(log.date).getDate() === selectedDay)
  const selectedWorkout = Boolean(selectedLog) || (isGuest && selectedDay === now.getDate() && completed)
  return <><PageHero eyebrow="YOUR WORK, ON RECORD" title="SHOWING UP " accent="LOOKS GOOD." subtitle="Every session is a promise you kept to yourself." action={<button className="period-select">{monthName.toUpperCase()} {now.getFullYear()}</button>} /><div className="history-layout"><section className="content-card calendar-card"><div className="calendar-month"><span>{weekdayName(selectedDay).toUpperCase()}, {monthName.toUpperCase()} {selectedDay}</span><span className="section-kicker">{visibleLogs.length} SESSIONS THIS MONTH</span></div><div className="calendar-grid">{['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map((d) => <span className="calendar-weekday" key={d}>{d}</span>)}{days.map((day, i) => <button key={i} onClick={() => day.date && setSelectedDay(day.date)} className={`calendar-day ${!day.date ? 'blank' : ''} ${day.date === selectedDay ? 'selected' : ''} ${day.workout ? 'has-workout' : ''}`}>{day.date || ''}{day.workout && <i />}</button>)}</div><div className="calendar-key"><span><i className="key-training" /> Training session</span><span><i className="key-selected" /> Selected day</span></div></section><aside className="content-card history-detail"><span className="section-kicker">SESSION DETAILS</span><div className="history-date"><div className="history-date-icon"><CalendarDays size={17} /></div><div><b>{selectedDay} {monthName}, {now.getFullYear()}</b><span>{weekdayName(selectedDay)} · Week {Math.ceil((selectedDay + offset) / 7)}</span></div></div>{selectedWorkout ? <><span className="history-focus">{selectedLog?.dayFocus || 'LEG DAY · LOWER BODY'}</span><div className="history-metric"><div><Clock3 size={15} /><span>Duration</span></div><b>{selectedLog?.duration || 54} <small>min</small></b></div><div className="history-metric"><div><Dumbbell size={15} /><span>Exercises</span></div><b>{selectedLog?.completedExercises?.length || 4} <small>moves</small></b></div><div className="history-metric"><div><CheckCircle2 size={15} /><span>Sets done</span></div><b>{selectedLog ? selectedLog.completedExercises.reduce((sum, item) => sum + item.sets.filter((set) => set.done).length, 0) : totalForHistory()} <small>sets</small></b></div><div className="history-note"><Sparkles size={15} /><span>Look at you, showing up for yourself. That’s what progress looks like.</span></div></> : <div className="history-empty"><Footprints size={20} /><b>A day to begin again.</b><span>No session logged. Your next workout is a fresh start.</span></div>}</aside></div></>
}

function totalForHistory() { return todayWorkout.exercises.reduce((total, exercise) => total + exercise.sets, 0) }

function FinishModal({ onClose, onNavigate, personalRecords = [], totalSets = 0, duration = 1 }) {
  const particles = Array.from({ length: 24 }, (_, i) => i)
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div className="finish-modal" initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 10 }} onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={17} /></button><div className="confetti-field">{particles.map((i) => <i key={i} style={{ '--i': i, '--angle': `${i * 15}deg`, '--distance': `${72 + i % 4 * 18}px` }} />)}</div><div className="finish-medal"><Trophy size={28} /></div><span className="section-kicker">THAT’S A WRAP</span><h2>YOU SHOWED UP.<br /><span>THAT’S EVERYTHING.</span></h2><p>Leg day, in the books. Every rep you put in today is building something bigger.</p><div className="finish-stats"><div><b>{totalSets}</b><span>SETS LOGGED</span></div><i /><div><b>08 <Flame size={18} fill="currentColor" /></b><span>DAY STREAK</span></div><i /><div><b>{duration}<span className="finish-unit">min</span></b><span>TIME MOVING</span></div></div><button className="finish-modal-button" onClick={onNavigate}>SEE YOUR PROGRESS <ArrowRight size={16} /></button><button className="close-quiet" onClick={onClose}>Take a breath. You earned it.</button></motion.div></motion.div>
}

function SettingsModal({ dark, setDark, user, onSignIn, onSignOut, onSaveProfile, onClose }) {
  const [units, setUnits] = useState(user?.units || 'kg')
  const [goal, setGoal] = useState(user?.goal || 'Get stronger & build muscle')
  const [currentWeight, setCurrentWeight] = useState(user?.currentWeight || '')
  const [targetWeight, setTargetWeight] = useState(user?.targetWeight || '')
  const [reminderTime, setReminderTime] = useState(user?.reminderTime || '')
  const [message, setMessage] = useState('')
  async function saveSettings() {
    if (user) {
      try { await onSaveProfile({ units, goal, reminderTime, currentWeight: currentWeight === '' ? null : Number(currentWeight), targetWeight: targetWeight === '' ? null : Number(targetWeight) }); setMessage('Settings saved to your account.') }
      catch (error) { setMessage(error.message) }
    } else {
      localStorage.setItem('grindplan-units', units); localStorage.setItem('grindplan-goal', goal); localStorage.setItem('grindplan-reminder', reminderTime); localStorage.setItem('grindplan-target-weight', targetWeight); setMessage('Settings saved on this device.')
    }
    if (reminderTime && 'Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') setMessage('Reminder enabled while GrindPlan is open.')
      else setMessage('Allow notifications in your browser to receive reminders.')
    }
  }
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div className="settings-modal" initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()}><div className="settings-head"><div><span className="section-kicker">YOUR SPACE, YOUR RULES</span><h3>Settings</h3></div><button className="modal-close" onClick={onClose}><X size={17} /></button></div><div className="settings-user"><div className="avatar">{user?.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'GP'}</div><div><b>{user?.name || 'Guest athlete'}</b><span>{user?.email || 'Save your progress across devices'}</span></div>{user ? <button className="text-button" onClick={onSignOut}>Sign out</button> : <button className="text-button" onClick={onSignIn}>Sign in <ArrowRight size={13} /></button>}</div><div className="settings-option"><div><b>Appearance</b><span>Choose how GrindPlan looks</span></div><button className="theme-toggle" onClick={() => setDark(!dark)}><span>{dark ? 'Dark' : 'Light'}</span><i className={dark ? 'toggle-on' : ''}><i /></i></button></div><div className="settings-option"><div><b>Units</b><span>Weight & measurement units</span></div><button className="units-toggle" onClick={() => setUnits(units === 'kg' ? 'lb' : 'kg')}>{units.toUpperCase()}</button></div><div className="settings-option goal-option"><label><b>Your goal</b><span>What are you working toward?</span></label><input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={90} /></div><div className="settings-option weight-goals"><label><b>Weight goal</b><span>Starting and target weight ({units})</span></label><div><input type="number" min="0" step="0.1" placeholder="Current" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)} /><input type="number" min="0" step="0.1" placeholder="Target" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} /></div></div><div className="settings-option reminder-option"><div><b>Workout reminder</b><span>Daily browser reminder (while app is open)</span></div><input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} /></div>{message && <div className="settings-message">{message}</div>}<div className="settings-footer"><span>GRINDPLAN v1.0</span><div>{user && <button className="signout-button" onClick={onSignOut}>Sign out</button>}<button onClick={saveSettings}>Save settings <Check size={14} /></button></div></div></motion.div></motion.div>
}

export default App
