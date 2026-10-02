import mongoose from 'mongoose'

const workoutLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, date: { type: Date, default: Date.now }, dayFocus: String, completedExercises: [{ exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }, sets: [{ reps: Number, weight: Number, done: { type: Boolean, default: false } }] }], duration: Number, notes: String,
}, { timestamps: true })

export default mongoose.model('WorkoutLog', workoutLogSchema)
