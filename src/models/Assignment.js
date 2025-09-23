import mongoose from 'mongoose'

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 1,
  },
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    files: [{
      filename: String,
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    grade: {
      type: Number,
      min: 0,
      max: 100,
    },
    feedback: String,
    gradedAt: Date,
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed'],
    default: 'published',
  },
}, {
  timestamps: true,
})

// Virtual for submission count
assignmentSchema.virtual('submissionCount').get(function() {
  return this.submissions.length
})

// Virtual for average grade
assignmentSchema.virtual('averageGrade').get(function() {
  const gradedSubmissions = this.submissions.filter(s => s.grade !== undefined)
  if (gradedSubmissions.length === 0) return null

  const totalGrade = gradedSubmissions.reduce((sum, s) => sum + s.grade, 0)
  return Math.round(totalGrade / gradedSubmissions.length)
})

// Virtual for due status
assignmentSchema.virtual('dueStatus').get(function() {
  const now = new Date()
  const due = new Date(this.dueDate)

  if (now > due) return 'overdue'
  if (now > new Date(due.getTime() - 24 * 60 * 60 * 1000)) return 'due-soon'
  return 'upcoming'
})

// Ensure virtuals are serialized
assignmentSchema.set('toJSON', { virtuals: true })

const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema)

export default Assignment
