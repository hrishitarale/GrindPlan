
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

const allowedOrigins = [
  'http://localhost:5173',
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
]

app.use(helmet())

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Origin not allowed by CORS'))
  },
}))

app.use(express.json({ limit: '1mb' }))

// Keep the health check independent from MongoDB; API routes wait for the DB.
app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next()

  try {
    await connectDB()
    next()
  } catch (error) {
    console.error('Database connection failed:', error.message)
    res.status(503).json({ message: 'Database temporarily unavailable' })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/exercises', exerciseRoutes)
app.use('/api/plans', planRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/stats', statsRoutes)

app.use(errorHandler)

export default app

// Local development only.
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 5000

  connectDB()
    .then(() => {
      app.listen(port, () => {
        console.log(`GrindPlan API listening on ${port}`)
      })
    })
    .catch((error) => {
      console.error('Could not start the API:', error.message)
      process.exit(1)
    })
}
