import mongoose from 'mongoose'

const bodyStatsSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, date: { type: Date, default: Date.now }, weight: Number, bodyFat: Number, chest: Number, waist: Number, arms: Number, thighs: Number }, { timestamps: true })

export default mongoose.model('BodyStats', bodyStatsSchema)
