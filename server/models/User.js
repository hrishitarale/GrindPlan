import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, email: { type: String, required: true, unique: true, lowercase: true, trim: true }, password: { type: String, required: true, select: false },
  goal: { type: String, default: 'Get stronger & build muscle' }, currentWeight: Number, targetWeight: Number, units: { type: String, enum: ['kg', 'lb'], default: 'kg' }, reminderTime: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('User', userSchema)
