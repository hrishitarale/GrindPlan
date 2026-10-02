import { Router } from 'express'
import WorkoutLog from '../models/WorkoutLog.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth)
router.post('/', asyncHandler(async (req, res) => {
  const log = await WorkoutLog.create({ ...req.body, user: req.user.id, date: req.body.date || new Date() })
  res.status(201).json(log)
}))
router.get('/streak', asyncHandler(async (req, res) => {
  const logs = await WorkoutLog.find({ user: req.user.id }).select('date').sort({ date: -1 })
  const dates = new Set(logs.map(({ date }) => { const d = new Date(date); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }))
  const cursor = new Date(); cursor.setHours(0, 0, 0, 0)
  const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  if (!dates.has(key(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (dates.has(key(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
  res.json({ streak })
}))
router.get('/', asyncHandler(async (req, res) => {
  const logs = await WorkoutLog.find({ user: req.user.id }).sort({ date: -1 }).limit(365).populate('completedExercises.exercise')
  res.json(logs)
}))
export default router
