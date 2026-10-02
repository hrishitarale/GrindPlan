import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import exerciseRoutes from './routes/exercises.js'
import planRoutes from './routes/plans.js'
import logRoutes from './routes/logs.js'
import statsRoutes from './routes/stats.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api/exercises', exerciseRoutes)
app.use('/api/plans', planRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/stats', statsRoutes)
app.use(errorHandler)

const port = process.env.PORT || 5000
connectDB().then(() => app.listen(port, () => console.log(`GrindPlan API listening on ${port}`))).catch((error) => { console.error('Could not start the API:', error.message); process.exit(1) })
