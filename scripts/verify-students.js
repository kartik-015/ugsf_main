/**
 * Script to verify the populated student data
 */

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

// Define User Schema
const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  department: String,
  admissionYear: Number,
  academicInfo: {
    name: String,
    semester: Number,
    batch: String,
    rollNumber: String,
    phoneNumber: String,
    address: String,
  },
  interests: [String],
  experience: String,
  specialization: String,
}, { timestamps: true })

async function verifyStudents() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected\n')
    
    const User = mongoose.models.User || mongoose.model('User', userSchema)
    
    // Sample students from each department and year
    console.log('📋 SAMPLE STUDENTS:\n')
    console.log('='.repeat(80))
    
    const samples = [
      { dept: 'CSE', year: 2025, rollPrefix: '25DCS' },
      { dept: 'CSE', year: 2024, rollPrefix: '24DCS' },
      { dept: 'CE', year: 2023, rollPrefix: '23DCE' },
      { dept: 'IT', year: 2022, rollPrefix: '22DIT' },
    ]
    
    for (const { dept, year, rollPrefix } of samples) {
      const student = await User.findOne({
        role: 'student',
        department: dept,
        admissionYear: year
      }).lean()
      
      if (student) {
        console.log(`\n${dept} - ${year} Batch:`)
        console.log(`  Email: ${student.email}`)
        console.log(`  Name: ${student.academicInfo?.name}`)
        console.log(`  Roll Number: ${student.academicInfo?.rollNumber}`)
        console.log(`  Semester: ${student.academicInfo?.semester}`)
        console.log(`  Batch: ${student.academicInfo?.batch}`)
        console.log(`  Phone: ${student.academicInfo?.phoneNumber}`)
        console.log(`  Interests: ${student.interests?.join(', ')}`)
        console.log(`  Specialization: ${student.specialization}`)
      }
    }
    
    console.log('\n' + '='.repeat(80))
    
    // List first 5 students from each department
    console.log('\n📝 FIRST 5 STUDENTS PER DEPARTMENT:\n')
    
    for (const dept of ['CSE', 'CE', 'IT']) {
      console.log(`\n${dept} Department:`)
      const students = await User.find({ 
        role: 'student', 
        department: dept,
        admissionYear: 2025 
      })
      .limit(5)
      .select('email academicInfo.rollNumber academicInfo.name academicInfo.semester')
      .lean()
      
      students.forEach(s => {
        console.log(`  ${s.academicInfo?.rollNumber} - ${s.academicInfo?.name} (Sem ${s.academicInfo?.semester})`)
      })
    }
    
    console.log('\n✅ Verification complete!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 MongoDB connection closed\n')
  }
}

verifyStudents()
