import mongoose from 'mongoose'

const workoutPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, title: { type: String, required: true }, active: { type: Boolean, default: true }, starter: { type: Boolean, default: false }, days: [{ dayOfWeek: { type: Number, min: 0, max: 6, required: true }, focus: { type: String, default: '' }, isRestDay: { type: Boolean, default: false }, exercises: [{ exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }, sets: { type: Number, default: 3 }, reps: { type: String, default: '8–12' }, restSeconds: { type: Number, default: 90 }, notes: String }] }],
}, { timestamps: true })

export default mongoose.model('WorkoutPlan', workoutPlanSchema)
