// Add main admin and 4 additional admins
// Credentials: admin@charusat.edu.in, principal@charusat.ac.in, hod.csds@charusat.ac.in, hod.ceds@charusat.ac.in, hod.itds@charusat.ac.in
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { parseStudentEmail } from '@/lib/validation'

// Force recompile during dev so schema changes (like required flags) apply
if (mongoose.models.User) {
  delete mongoose.models.User
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: { unique: true },
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['student','mainadmin','admin','guide','principal','hod','project_coordinator'],
    default: 'student',
    index: true,
  },
  counselorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  department: {
    type: String,
  enum: ['CSE', 'CE', 'IT', 'ME', 'EC', 'CIVIL'],
    required: false,
  },
  university: {
    type: String,
    required: false,
  },
  institute: {
    type: String,
    required: false,
  },
  admissionYear: {
    type: Number,
    required: false,
  },
  academicInfo: {
    name: String,
    semester: {
      type: Number,
      min: 1,
      max: 8,
    },
    batch: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
    },
    rollNumber: String,
    phoneNumber: String,
    cgpa: {
      type: Number,
      min: 0,
      max: 10,
    },
  },
  // Onboarding / profile fields
  interests: [{
    type: String,
    enum: [
      'Web Development', 'Mobile Development', 'Data Science', 'AI/ML',
      'Cybersecurity', 'Cloud Computing', 'DevOps', 'UI/UX Design',
      'Blockchain', 'IoT', 'Game Development', 'Software Engineering',
      'Embedded Systems', 'AR/VR', 'Robotics'
    ]
  }],
  skills: String,          // Comma-separated or free text for technologies known
  githubProfile: String,   // GitHub profile URL
  linkedinProfile: String,  // LinkedIn profile URL
  experience: String,
  specialization: String,
  education: String,
  isOnboarded: {
    type: Boolean,
    default: false,
  },
  isRegistered: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Email verification
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationOTP: String,
  emailVerificationExpires: Date,
  emailVerificationResendCount: {
    type: Number,
    default: 0,
  },
  emailVerificationLastSent: Date,
  emailVerificationAttemptCount: {
    type: Number,
    default: 0,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  // Approval workflow
  isApproved: {
    type: Boolean,
    default: false,
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  // Force password change on first login
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
  passwordChangeOTP: String,
  passwordChangeOTPExpires: Date,
  passwordChangeOTPResendCount: {
    type: Number,
    default: 0,
  },
  passwordChangeOTPLastSent: Date,
  passwordChangeOTPAttemptCount: {
    type: Number,
    default: 0,
  },
  // Password reset fields
  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, {
  timestamps: true,
})

// Extract department and admission year from email
userSchema.pre('save', function(next) {
  if (this.isModified('email') && this.role === 'student') {
    const parsed = parseStudentEmail(this.email)
    if(parsed){
      this.admissionYear = parsed.admissionYear
      this.department = parsed.department
      this.institute = parsed.institute
      // Ensure academicInfo exists
      this.academicInfo = this.academicInfo || {}
      if(!this.academicInfo.rollNumber){
        this.academicInfo.rollNumber = parsed.rollNumber
      }
    } else {
      return next(new Error('Invalid student email format. Expected yydeprol@charusat.edu.in'))
    }
  }
  next()
})

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto')
  const resetToken = crypto.randomBytes(32).toString('hex')
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000 // 10 minutes
  return resetToken
}

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.academicInfo?.name || this.email.split('@')[0]
})

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  if (this.academicInfo?.name) {
    return this.academicInfo.name
  }
  if (this.role === 'student') {
    return this.rollNumber || this.email.split('@')[0]
  }
  return this.email.split('@')[0]
})

// Virtual for student info
userSchema.virtual('studentInfo').get(function() {
  if (this.role !== 'student') return null
  return {
    department: this.department,
    admissionYear: this.admissionYear,
    semester: this.academicInfo?.semester,
    batch: this.academicInfo?.batch,
    rollNumber: this.academicInfo?.rollNumber
  }
})

// Ensure virtuals are serialized
userSchema.set('toJSON', { virtuals: true })

// Performance indexes for queries with 1000+ concurrent users
userSchema.index({ role: 1, department: 1 })
userSchema.index({ role: 1, isActive: 1 })
userSchema.index({ role: 1, isActive: 1, department: 1 })
userSchema.index({ 'academicInfo.name': 1 })
userSchema.index({ 'academicInfo.rollNumber': 1 })
userSchema.index({ 'academicInfo.semester': 1 })
userSchema.index({ role: 1, isEmailVerified: 1 })
userSchema.index({ email: 'text', 'academicInfo.name': 'text', 'academicInfo.rollNumber': 'text' })

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User