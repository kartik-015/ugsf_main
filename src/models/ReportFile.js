import mongoose from 'mongoose'

const reportFileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  contentType: { type: String, default: 'application/pdf' },
  data: { type: Buffer, required: true },
  size: { type: Number },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

reportFileSchema.index({ createdAt: 1 })

export default mongoose.models.ReportFile || mongoose.model('ReportFile', reportFileSchema)
