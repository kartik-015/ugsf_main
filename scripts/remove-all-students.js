/**
 * Script to remove all students from MongoDB
 */

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-portal'

// Define User Schema
const userSchema = new mongoose.Schema({
  email: String,
  role: String,
}, { strict: false })

async function removeAllStudents() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    const User = mongoose.models.User || mongoose.model('User', userSchema)
    
    // Count existing students
    const existingCount = await User.countDocuments({ role: 'student' })
    console.log(`📊 Found ${existingCount} existing students`)
    
    if (existingCount === 0) {
      console.log('✅ No students to remove')
      return
    }
    
    // Remove all students
    console.log('🗑️  Removing all students...')
    const result = await User.deleteMany({ role: 'student' })
    console.log(`✅ Successfully deleted ${result.deletedCount} students\n`)
    
    // Verify
    const remainingCount = await User.countDocuments({ role: 'student' })
    console.log(`📊 Remaining students: ${remainingCount}`)
    
    if (remainingCount === 0) {
      console.log('✨ All students removed successfully!')
    } else {
      console.log('⚠️  Warning: Some students may still remain')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 MongoDB connection closed\n')
  }
}

removeAllStudents()
