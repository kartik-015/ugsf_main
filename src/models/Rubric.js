import mongoose from 'mongoose'

if (mongoose.models.Rubric) {
  delete mongoose.models.Rubric
}

const rubricCriteriaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  maxScore: { type: Number, default: 10 },
  description: String,
}, { _id: true })

const rubricSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  semester: { type: Number },
  criteria: [rubricCriteriaSchema],
  totalMaxScore: { type: Number, default: 10 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

rubricSchema.index({ department: 1, isActive: 1 })
rubricSchema.index({ department: 1, semester: 1 })

const Rubric = mongoose.models.Rubric || mongoose.model('Rubric', rubricSchema)

export default Rubric
