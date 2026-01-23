/**
 * Verification script - Show complete database status
 */

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-portal'

const userSchema = new mongoose.Schema({}, { strict: false })

async function verifySetup() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected\n')
    
    const User = mongoose.model('User', userSchema)
    
    console.log('=' .repeat(80))
    console.log('📊 COMPLETE DATABASE STATUS')
    console.log('='.repeat(80))
    
    // Overall counts
    const totalUsers = await User.countDocuments()
    const students = await User.countDocuments({ role: 'student' })
    const admin = await User.countDocuments({ role: 'admin' })
    const principal = await User.countDocuments({ role: 'principal' })
    const hods = await User.countDocuments({ role: 'hod' })
    const guides = await User.countDocuments({ role: 'guide' })
    
    console.log('\n📈 User Counts:')
    console.log(`  Total Users: ${totalUsers}`)
    console.log(`  Students: ${students}`)
    console.log(`  Admin: ${admin}`)
    console.log(`  Principal: ${principal}`)
    console.log(`  HODs: ${hods}`)
    console.log(`  Guides: ${guides}`)
    
    // Student breakdown by department
    console.log('\n👨‍🎓 Students by Department:')
    for (const dept of ['CSE', 'CE', 'IT']) {
      const count = await User.countDocuments({ role: 'student', department: dept })
      console.log(`  ${dept}: ${count} students`)
      
      // Show by year
      for (const year of [2025, 2024, 2023, 2022]) {
        const yearCount = await User.countDocuments({ 
          role: 'student', 
          department: dept, 
          admissionYear: year 
        })
        const label = year === 2025 ? '1st' : year === 2024 ? '2nd' : year === 2023 ? '3rd' : '4th'
        console.log(`    ${label} Year (${year}): ${yearCount}`)
      }
    }
    
    // Show sample students (first 3 from each dept)
    console.log('\n📋 Sample Students (sorted by Roll Number):')
    for (const dept of ['CSE', 'CE', 'IT']) {
      const sampleStudents = await User.find({ 
        role: 'student', 
        department: dept,
        admissionYear: 2025 
      })
      .select('academicInfo.name academicInfo.rollNumber email')
      .sort({ 'academicInfo.rollNumber': 1 })
      .limit(3)
      .lean()
      
      console.log(`\n  ${dept} Department (First 3):`)
      sampleStudents.forEach(s => {
        console.log(`    ${s.academicInfo?.rollNumber} - ${s.academicInfo?.name}`)
      })
    }
    
    // Principal
    console.log('\n👔 Principal:')
    const principalUser = await User.findOne({ role: 'principal' })
      .select('academicInfo.name email department')
      .lean()
    if (principalUser) {
      console.log(`  ${principalUser.academicInfo?.name} - ${principalUser.email}`)
    }
    
    // HODs
    console.log('\n👨‍💼 HODs:')
    const hodUsers = await User.find({ role: 'hod' })
      .select('academicInfo.name email department')
      .sort({ department: 1 })
      .lean()
    hodUsers.forEach(h => {
      console.log(`  ${h.academicInfo?.name} (${h.department}) - ${h.email}`)
    })
    
    // Guides by department
    console.log('\n👨‍🏫 Guides:')
    for (const dept of ['CSE', 'CE', 'IT']) {
      const deptGuides = await User.find({ role: 'guide', department: dept })
        .select('academicInfo.name email')
        .sort({ 'academicInfo.name': 1 })
        .lean()
      console.log(`\n  ${dept} Department (${deptGuides.length} guides):`)
      deptGuides.forEach(g => {
        console.log(`    ${g.academicInfo?.name} - ${g.email}`)
      })
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ Database verification complete!')
    console.log('\n📧 Login Credentials:')
    console.log('  Students: rollnumber@charusat.edu.in / Student@123')
    console.log('  Faculty: firstname.lastname@charusat.edu.in / Faculty@123')
    console.log('  Admin: admin@charusat.edu.in / (existing password)')
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 MongoDB connection closed')
  }
}

verifySetup()
