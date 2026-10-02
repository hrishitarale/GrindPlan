
import mongoose from 'mongoose'

let cached = globalThis.mongooseConnection

if (!cached) {
  cached = globalThis.mongooseConnection = {
    conn: null,
    promise: null,
  }
}

export async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required')
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI)
      .then((mongooseInstance) => mongooseInstance)
      .catch((error) => {
        cached.promise = null
        throw error
      })
  }

  cached.conn = await cached.promise
  return cached.conn
}
