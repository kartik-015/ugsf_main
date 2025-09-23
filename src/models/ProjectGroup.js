import mongoose from 'mongoose'

const projectMemberSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['leader', 'member'],
    default: 'member',
  }
}, { _id: false })

const externalGuideSchema = new mongoose.Schema({
  name: String,
  organization: String,
  email: String,
  phone: String,
}, { _id: false })

const weeklyReportSchema = new mongoose.Schema({
  weekStart: { type: Date, required: true },
  weekEnd: { type: Date, required: true },
  summary: { type: String, required: true },
  accomplishments: String,
  blockers: String,
  planNextWeek: String,
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submittedAt: { type: Date, default: Date.now },
  feedback: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
}, { _id: true })

const projectGroupSchema = new mongoose.Schema({
  approvals: {
    type: Map,
    of: String, // 'approved', 'rejected', 'pending'
    default: function() { return { hodcse: 'pending', hodce: 'pending', hodit: 'pending' } }
  },
  // Helper to get overall status
  groupId: {
    type: String,
    unique: true,
    index: true,
  },
  title: { type: String, required: true },
  description: String,
  domain: String,
  department: {
    type: String,
    enum: ['CSE', 'CE', 'IT'],
    required: true,
  },
  semester: { type: Number, min: 1, max: 8, required: true },
  members: [projectMemberSchema],
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  internalGuide: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  externalGuide: externalGuideSchema,
  hodApproval: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under-review', 'approved', 'rejected'],
    default: 'submitted'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  chatRoomId: { type: String, index: true },
  weeklyReports: [weeklyReportSchema],
  // Lightweight progress & report tracking (separate from detailed weeklyReports)
  progressScore: { type: Number, min: 0, max: 10, default: 0 },
  reports: [{
    week: { type: Number, min: 1 },
    pdfUrl: String,
    submittedAt: { type: Date, default: Date.now },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    feedback: String,
    feedbackAt: Date,
    feedbackBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
}, { timestamps: true })

// Helper to get overall status
projectGroupSchema.methods.getStatus = function() {
  const values = Object.values(this.approvals || {})
  if (values.length === 0) return 'submitted'
  if (values.every(v => v === 'approved')) return 'approved'
  if (values.some(v => v === 'rejected')) return 'rejected'
  if (values.some(v => v === 'pending')) return 'pending'
  return 'submitted'
}

projectGroupSchema.pre('save', function(next) {
  if (!this.groupId) {
    // Create a compact unique group id: <DEPT>-S<SEM>-<YY><random>
    const year = new Date().getFullYear().toString().slice(-2)
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    this.groupId = `${this.department}-S${this.semester}-${year}-${random}`
  }
  if (!this.chatRoomId) {
    this.chatRoomId = `grp_${this.groupId}`
  }
  next()
})

const ProjectGroup = mongoose.models.ProjectGroup || mongoose.model('ProjectGroup', projectGroupSchema)

export default ProjectGroup




