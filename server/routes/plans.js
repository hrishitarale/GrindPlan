import { Router } from 'express'
import WorkoutPlan from '../models/WorkoutPlan.js'
import Exercise from '../models/Exercise.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth)
const populated = (query) => query.populate('days.exercises.exercise')

router.get('/today', asyncHandler(async (req, res) => {
  let plan = await WorkoutPlan.findOne({ user: req.user.id, active: true }).sort({ updatedAt: -1 })
  if (!plan) {
    plan = await WorkoutPlan.findOne({ user: req.user.id }).sort({ updatedAt: -1 })
    if (plan) { plan.active = true; await plan.save() }
  }
  if (plan) await plan.populate('days.exercises.exercise')
  if (!plan) return res.json({ plan: null, day: null })
  const dayOfWeek = new Date().getDay()
  res.json({ plan: plan._id, title: plan.title, day: plan.days.find((day) => day.dayOfWeek === dayOfWeek) || null })
}))

router.get('/', asyncHandler(async (req, res) => res.json(await populated(WorkoutPlan.find({ user: req.user.id }).sort({ updatedAt: -1 })))))

router.post('/starter', asyncHandler(async (req, res) => {
  const existing = await WorkoutPlan.findOne({ user: req.user.id, starter: true })
  if (existing) return res.json(await populated(WorkoutPlan.findById(existing._id)))
  const sample = [
    ['Barbell back squat', 'Quads, Glutes', 'Barbell', 4, '8–10', 120], ['Romanian deadlift', 'Hamstrings, Glutes', 'Barbell', 3, '10–12', 90], ['Leg press', 'Quads', 'Machine', 3, '12', 90], ['Walking lunges', 'Quads, Glutes', 'Dumbbells', 3, '10 / leg', 60],
    ['Dumbbell bench press', 'Chest, Triceps', 'Dumbbells', 4, '8–12', 90], ['Overhead press', 'Shoulders, Triceps', 'Barbell', 3, '8–10', 90], ['Incline dumbbell press', 'Chest', 'Dumbbells', 3, '10–12', 75], ['Triceps cable pushdown', 'Triceps', 'Cable', 3, '12', 60],
    ['Lat pulldown', 'Back, Biceps', 'Cable', 4, '8–12', 90], ['Seated cable row', 'Back, Biceps', 'Cable', 3, '10–12', 75], ['Face pull', 'Shoulders, Back', 'Cable', 3, '15', 60], ['Dumbbell curl', 'Biceps', 'Dumbbells', 3, '12', 60],
  ]
  const exerciseDocs = await Promise.all(sample.map(([name, muscleGroup, equipment, sets, reps, restSeconds]) => Exercise.findOneAndUpdate({ name }, { $setOnInsert: { name, muscleGroup, equipment, difficulty: 'intermediate', videoUrl: '', instructions: [], tips: [] } }, { new: true, upsert: true })))
  const byName = new Map(exerciseDocs.map((item) => [item.name, item]))
  const toItems = (names) => names.map((name) => { const ex = byName.get(name); const source = sample.find((entry) => entry[0] === name); return { exercise: ex._id, sets: source[3], reps: source[4], restSeconds: source[5] } })
  const days = [
    { dayOfWeek: 0, focus: 'Rest & reset', isRestDay: true, exercises: [] },
    { dayOfWeek: 1, focus: 'Leg day', exercises: toItems(['Barbell back squat', 'Romanian deadlift', 'Leg press', 'Walking lunges']) },
    { dayOfWeek: 2, focus: 'Push day', exercises: toItems(['Dumbbell bench press', 'Overhead press', 'Incline dumbbell press', 'Triceps cable pushdown']) },
    { dayOfWeek: 3, focus: 'Pull day', exercises: toItems(['Lat pulldown', 'Seated cable row', 'Face pull', 'Dumbbell curl']) },
    { dayOfWeek: 4, focus: 'Active recovery', isRestDay: true, exercises: [] },
    { dayOfWeek: 5, focus: 'Upper body', exercises: toItems(['Dumbbell bench press', 'Seated cable row', 'Overhead press']) },
    { dayOfWeek: 6, focus: 'Lower body', exercises: toItems(['Leg press', 'Romanian deadlift', 'Walking lunges']) },
  ]
  const plan = await WorkoutPlan.create({ user: req.user.id, title: 'Foundation · 4 week split', active: true, starter: true, days })
  res.status(201).json(await populated(WorkoutPlan.findById(plan._id)))
}))

router.post('/', asyncHandler(async (req, res) => {
  const plan = await WorkoutPlan.create({ ...req.body, user: req.user.id, starter: false })
  res.status(201).json(await populated(WorkoutPlan.findById(plan._id)))
}))

router.put('/:id', asyncHandler(async (req, res) => {
  const updates = { ...req.body }; delete updates.user; delete updates.starter
  if (updates.active) await WorkoutPlan.updateMany({ user: req.user.id }, { active: false })
  const plan = await WorkoutPlan.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, updates, { new: true, runValidators: true })
  if (!plan) return res.status(404).json({ message: 'Workout plan not found' })
  res.json(await populated(WorkoutPlan.findById(plan._id)))
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await WorkoutPlan.findOneAndDelete({ _id: req.params.id, user: req.user.id })
  if (!result) return res.status(404).json({ message: 'Workout plan not found' })
  res.status(204).end()
}))

export default router
