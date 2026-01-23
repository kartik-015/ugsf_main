/**
 * Quick test to check actual student count in database
 */

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-portal'

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
}, { strict: false })

async function quickCount() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected\n')
    
    const User = mongoose.models.User || mongoose.model('User', userSchema)
    
    // Get counts
    const studentCount = await User.countDocuments({ role: 'student' })
    const allUsersCount = await User.countDocuments()
    
    console.log(`📊 Total Users: ${allUsersCount}`)
    console.log(`📊 Students: ${studentCount}`)
    console.log(`📊 Other Users: ${allUsersCount - studentCount}\n`)
    
    // Check roles
    const roles = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    
    console.log('📋 Users by Role:')
    roles.forEach(r => {
      console.log(`  ${r._id || 'undefined'}: ${r.count}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 MongoDB connection closed')
  }
}

quickCount()
