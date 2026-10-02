import { Router } from 'express'
import BodyStats from '../models/BodyStats.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth)
router.post('/', asyncHandler(async (req, res) => {
  const allowed = ['weight', 'bodyFat', 'chest', 'waist', 'arms', 'thighs']
  const values = Object.fromEntries(Object.entries(req.body).filter(([key, value]) => allowed.includes(key) && value !== '' && value != null).map(([key, value]) => [key, Number(value)]))
  if (!Object.keys(values).length || Object.values(values).some((value) => !Number.isFinite(value) || value < 0)) return res.status(400).json({ message: 'Enter at least one valid measurement' })
  const item = await BodyStats.create({ ...values, user: req.user.id, date: req.body.date ? new Date(req.body.date) : new Date() })
  res.status(201).json(item)
}))
router.get('/', asyncHandler(async (req, res) => res.json(await BodyStats.find({ user: req.user.id }).sort({ date: 1 }).limit(500))))
export default router
