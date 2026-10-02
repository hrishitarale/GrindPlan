import { Router } from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import { createToken } from '../utils/token.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, goal: user.goal, currentWeight: user.currentWeight, targetWeight: user.targetWeight, units: user.units, reminderTime: user.reminderTime })

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, goal, units } = req.body
  if (!name?.trim() || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required' })
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address' })
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' })
  if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with that email already exists' })
  const user = await User.create({ name: name.trim(), email, password: await bcrypt.hash(password, 12), goal, units })
  res.status(201).json({ token: createToken(user), user: publicUser(user) })
}))

router.post('/login', asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() }).select('+password')
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) return res.status(401).json({ message: 'Email or password is incorrect' })
  res.json({ token: createToken(user), user: publicUser(user) })
}))

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) return res.status(404).json({ message: 'Account not found' })
  res.json({ user: publicUser(user) })
}))

router.put('/me', requireAuth, asyncHandler(async (req, res) => {
  const allowed = ['name', 'goal', 'currentWeight', 'targetWeight', 'units', 'reminderTime']
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true })
  res.json({ user: publicUser(user) })
}))

export default router
