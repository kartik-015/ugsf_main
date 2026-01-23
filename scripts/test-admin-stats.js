/**
 * Test the admin stats API endpoint
 */

console.log('Testing admin stats API...\n')

// Note: This would need proper authentication in a real test
// For now, just verify the database has the data

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

const userSchema = new mongoose.Schema({}, { strict: false })
const projectGroupSchema = new mongoose.Schema({}, { strict: false })

async function testStats() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    const User = mongoose.models.User || mongoose.model('User', userSchema)
    const ProjectGroup = mongoose.models.ProjectGroup || mongoose.model('ProjectGroup', projectGroupSchema)
    
    // Simulate what the API does
    const [totalStudents, totalFaculty, pendingOnboarding, projectGroups] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: { $in: ['guide', 'hod'] } }),
      User.countDocuments({ isOnboarded: false }),
      ProjectGroup.find({}).populate('members', '_id').catch(() => [])
    ])

    const assignedStudentIds = new Set()
    projectGroups.forEach(group => {
      if (group.members && Array.isArray(group.members)) {
        group.members.forEach(member => {
          if (member && member._id) {
            assignedStudentIds.add(member._id.toString())
          }
        })
      }
    })
    const assignedStudents = assignedStudentIds.size

    const stats = {
      totalStudents,
      totalFaculty,
      pendingOnboarding,
      assignedStudents
    }
    
    console.log('📊 API Stats Result:')
    console.log('='.repeat(50))
    console.log(`Total Students: ${stats.totalStudents}`)
    console.log(`Total Faculty: ${stats.totalFaculty}`)
    console.log(`Pending Onboarding: ${stats.pendingOnboarding}`)
    console.log(`Assigned Students: ${stats.assignedStudents}`)
    console.log('='.repeat(50))
    
    if (stats.totalStudents === 360) {
      console.log('\n✅ SUCCESS: API will return 360 students!')
    } else {
      console.log(`\n❌ ERROR: Expected 360, API will return ${stats.totalStudents}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.connection.close()
  }
}

testStats()
