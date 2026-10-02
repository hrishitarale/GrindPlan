import { Router } from 'express'
import Exercise from '../models/Exercise.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.get('/', asyncHandler(async (req, res) => {
  const query = {}
  if (req.query.muscle) query.muscleGroup = new RegExp(req.query.muscle, 'i')
  if (req.query.search) query.name = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  res.json(await Exercise.find(query).sort({ name: 1 }).limit(200))
}))
router.post('/', requireAuth, asyncHandler(async (req, res) => res.status(201).json(await Exercise.create(req.body))))
router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const exercise = await Exercise.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' })
  res.json(exercise)
}))
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const exercise = await Exercise.findByIdAndDelete(req.params.id)
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' })
  res.status(204).end()
}))
export default router
