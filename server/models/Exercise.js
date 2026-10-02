import mongoose from 'mongoose'

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, muscleGroup: { type: String, required: true, index: true }, equipment: { type: String, default: 'Bodyweight' }, difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' }, videoUrl: { type: String, default: '' }, thumbnail: { type: String, default: '' }, instructions: [String], tips: [String],
}, { timestamps: true })

export default mongoose.model('Exercise', exerciseSchema)
