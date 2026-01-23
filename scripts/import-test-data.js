/**
 * Import Test Registration Data Script
 * 
 * This script reads the test-registration-data.csv file and creates user accounts
 * with complete registration and onboarding data for testing purposes.
 * 
 * Usage: node scripts/import-test-data.js
 */

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables - check both .env.local and .env
dotenv.config({ path: '.env.local' })
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import User model
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
    enum: ['student', 'mainadmin', 'admin', 'guide', 'principal', 'hod'],
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
    address: String,
  },
  interests: [{
    type: String,
    enum: [
      'Web Development', 'Mobile Development', 'Data Science', 'AI/ML',
      'Cybersecurity', 'Cloud Computing', 'DevOps', 'UI/UX Design',
      'Blockchain', 'IoT', 'Game Development', 'Software Engineering'
    ]
  }],
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
  isApproved: {
    type: Boolean,
    default: false,
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, {
  timestamps: true,
})

// Hash password before saving
import bcrypt from 'bcryptjs'

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

const User = mongoose.models.User || mongoose.model('User', userSchema)

// Parse CSV helper
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim())
  const headers = lines[0].split(',').map(h => h.trim())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const row = {}
    
    // Handle quoted fields properly
    const regex = /(?:^|,)("(?:[^"]|"")*"|[^,]*)/g
    const values = []
    let match
    
    while ((match = regex.exec(line)) !== null) {
      let value = match[1]
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1)
        // Replace escaped quotes
        value = value.replace(/""/g, '"')
      }
      values.push(value.trim())
    }
    
    headers.forEach((header, index) => {
      const value = values[index] || ''
      row[header] = value
    })
    
    if (row.email) { // Only add rows with email
      data.push(row)
    }
  }

  return data
}

// Transform CSV row to user document
function transformToUser(row) {
  const isStudent = row.role === 'student'
  const isGuide = row.role === 'guide'

  const userData = {
    email: row.email,
    password: row.password,
    role: row.role,
    department: row.department,
    university: row.university,
    institute: row.institute,
    isEmailVerified: true, // Auto-verify for testing
    isOnboarded: true, // Auto-onboard for testing
    isRegistered: true,
    isActive: true,
    isApproved: true, // Auto-approve for testing
    approvalStatus: 'approved',
  }

  // Student-specific fields
  if (isStudent) {
    userData.admissionYear = parseInt(row.admissionYear)
    userData.academicInfo = {
      name: row.name,
      phoneNumber: row.phoneNumber,
      address: row.address,
      semester: parseInt(row.semester),
      batch: row.batch,
      rollNumber: row.rollNumber,
    }
  }

  // Guide-specific fields
  if (isGuide) {
    userData.academicInfo = {
      name: row.name,
      phoneNumber: row.phoneNumber,
      address: row.address,
    }
    userData.specialization = row.specialization
    userData.education = row.education
    userData.experience = row.experience
  }

  // Parse interests (semicolon separated)
  if (row.interests) {
    userData.interests = row.interests.split(';').map(i => i.trim())
  }

  return userData
}

// Main import function
async function importTestData() {
  try {
    console.log('🚀 Starting test data import...\n')

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI
    if (!mongoUri) {
      throw new Error('MONGODB_URI or MONGO_URI not found in environment variables')
    }

    console.log('📦 Connecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB\n')

    // Read CSV file
    const csvPath = path.join(__dirname, '..', 'test-registration-data.csv')
    console.log(`📄 Reading CSV file: ${csvPath}`)
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at ${csvPath}`)
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const rows = parseCSV(csvContent)
    
    console.log(`✅ Found ${rows.length} records in CSV\n`)

    // Import users
    let successCount = 0
    let errorCount = 0
    const errors = []

    console.log('📥 Importing users...\n')

    for (const row of rows) {
      try {
        const userData = transformToUser(row)
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email })
        
        if (existingUser) {
          console.log(`⚠️  User already exists: ${userData.email} - Skipping`)
          continue
        }

        // Create new user
        const user = new User(userData)
        await user.save()
        
        console.log(`✅ Created ${userData.role}: ${userData.email} - ${userData.academicInfo?.name || 'N/A'}`)
        successCount++
        
      } catch (error) {
        errorCount++
        const errorMsg = `❌ Error creating ${row.email}: ${error.message}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 IMPORT SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Successfully created: ${successCount} users`)
    console.log(`⚠️  Skipped (already exist): ${rows.length - successCount - errorCount} users`)
    console.log(`❌ Errors: ${errorCount} users`)
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:')
      errors.forEach(err => console.log(err))
    }

    console.log('\n' + '='.repeat(60))
    console.log('🎉 Import completed!')
    console.log('='.repeat(60))
    
    // Show sample login credentials
    console.log('\n📝 SAMPLE LOGIN CREDENTIALS:')
    console.log('-'.repeat(60))
    console.log('Students (CSE):')
    console.log('  Email: 23CS001@charusat.edu.in | Password: kartik123')
    console.log('  Email: 24CS001@charusat.edu.in | Password: kartik123')
    console.log('\nStudents (CE):')
    console.log('  Email: 23CE001@charusat.edu.in | Password: kartik123')
    console.log('  Email: 24CE001@charusat.edu.in | Password: kartik123')
    console.log('\nStudents (IT):')
    console.log('  Email: 23DIT001@charusat.edu.in | Password: kartik123')
    console.log('  Email: 24DIT001@charusat.edu.in | Password: kartik123')
    console.log('\nFaculty:')
    console.log('  Email: rajesh.kumar@charusat.ac.in | Password: kartik123')
    console.log('  Email: priya.shah@charusat.ac.in | Password: kartik123')
    console.log('-'.repeat(60))
    console.log('\n💡 All passwords are: kartik123')
    console.log('✨ All users are pre-verified and onboarded!\n')

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('👋 MongoDB connection closed')
  }
}

// Run the import
importTestData()
