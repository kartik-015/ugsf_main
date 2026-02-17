import mongoose from 'mongoose'

if (mongoose.models.ProjectGroup) {
  delete mongoose.models.ProjectGroup
}

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

const monthlyReportSchema = new mongoose.Schema({
  month: { type: Number, min: 1, max: 12, required: true },
  year: { type: Number, required: true },
  title: { type: String, required: true },
  pdfUrl: { type: String, required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submittedAt: { type: Date, default: Date.now },
  turnedIn: { type: Boolean, default: false },
  turnedInAt: Date,
  replacedAt: Date,
  grade: { type: String, enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F', ''], default: '' },
  score: { type: Number, min: 0, max: 10 },
  feedback: String,
  feedbackAt: Date,
  feedbackBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['draft', 'submitted', 'graded', 'revision-needed'], default: 'draft' },
}, { _id: true })

const deadlineSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: { type: Date, required: true },
  setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isCompleted: { type: Boolean, default: false },
  completedAt: Date,
}, { _id: true })

const rubricCriteriaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  maxScore: { type: Number, default: 10 },
  description: String,
}, { _id: true })

const rubricSchema = new mongoose.Schema({
  title: { type: String, required: true },
  criteria: [rubricCriteriaSchema],
  totalMaxScore: { type: Number, default: 10 },
  setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  setAt: { type: Date, default: Date.now },
  department: String,
  semester: Number,
}, { _id: true })

const projectGroupSchema = new mongoose.Schema({
  groupId: {
    type: String,
    unique: true,
    index: true,
  },
  title: { type: String, required: true },
  description: String,
  domain: String,
  technology: String, // Tech stack used
  department: {
    type: String,
    enum: ['CSE', 'CE', 'IT', 'ME', 'EC', 'CIVIL'],
    required: true,
  },
  semester: { type: Number, min: 1, max: 8, required: true },
  academicYear: String, // e.g. "2025-26"
  members: [projectMemberSchema],
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Guide assignment
  internalGuide: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  externalGuide: externalGuideSchema,
  
  // Guide acceptance workflow
  guideStatus: {
    type: String,
    enum: ['not-assigned', 'pending', 'accepted', 'rejected'],
    default: 'not-assigned',
  },
  guideRemarks: String, // Remarks from guide on accept/reject
  guideRespondedAt: Date,
  
  // HOD approval
  hodApproval: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  hodRemarks: String,
  hodApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hodApprovedAt: Date,
  
  // Overall status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under-review', 'approved', 'rejected', 'in-progress', 'completed'],
    default: 'submitted'
  },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  chatRoomId: { type: String, index: true },
  
  // Monthly reports
  monthlyReports: [monthlyReportSchema],
  
  // Deadlines set by guide
  deadlines: [deadlineSchema],
  
  // Progress tracking
  progressScore: { type: Number, min: 0, max: 100, default: 0 },
  
  // Project modification tracking - students can modify only once
  hasBeenModified: { type: Boolean, default: false },
  modifiedAt: Date,
  modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Legacy reports field (backward compatibility)
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

projectGroupSchema.pre('save', function(next) {
  if (!this.groupId) {
    const year = new Date().getFullYear().toString().slice(-2)
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    this.groupId = `${this.department}-S${this.semester}-${year}-${random}`
  }
  if (!this.chatRoomId) {
    this.chatRoomId = `grp_${this.groupId}`
  }
  // Set academic year
  if (!this.academicYear) {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    this.academicYear = m >= 6 ? `${y}-${(y+1).toString().slice(-2)}` : `${y-1}-${y.toString().slice(-2)}`
  }
  next()
})

// Index for efficient queries
projectGroupSchema.index({ department: 1, semester: 1, status: 1 })
projectGroupSchema.index({ 'members.student': 1 })
projectGroupSchema.index({ internalGuide: 1 })
projectGroupSchema.index({ leader: 1 })
projectGroupSchema.index({ domain: 1 })
projectGroupSchema.index({ hodApproval: 1 })
projectGroupSchema.index({ department: 1, hodApproval: 1 })

const ProjectGroup = mongoose.models.ProjectGroup || mongoose.model('ProjectGroup', projectGroupSchema)

export default ProjectGroup




