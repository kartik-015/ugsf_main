/**
 * Script to verify all 360 students are created with proper roll numbers
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
    rollNumber: String,
    semester: Number,
  },
}, { timestamps: true })

async function verifyAllStudents() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected\n')
    
    const User = mongoose.models.User || mongoose.model('User', userSchema)
    
    console.log('📊 COMPLETE VERIFICATION\n')
    console.log('='.repeat(80))
    
    const departments = [
      { code: 'DCS', name: 'CSE' },
      { code: 'DCE', name: 'CE' },
      { code: 'DIT', name: 'IT' }
    ]
    
    const years = [
      { year: 25, admissionYear: 2025, label: '1st Year (2025 batch)' },
      { year: 24, admissionYear: 2024, label: '2nd Year (2024 batch)' },
      { year: 23, admissionYear: 2023, label: '3rd Year (2023 batch)' },
      { year: 22, admissionYear: 2022, label: '4th Year (2022 batch)' }
    ]
    
    let totalCount = 0
    let allRollNumbers = []
    
    for (const dept of departments) {
      console.log(`\n${dept.name} Department:`)
      
      for (const batch of years) {
        const students = await User.find({
          role: 'student',
          department: dept.name,
          admissionYear: batch.admissionYear
        })
        .select('academicInfo.rollNumber')
        .sort({ 'academicInfo.rollNumber': 1 })
        .lean()
        
        const rollNumbers = students.map(s => s.academicInfo?.rollNumber).filter(Boolean)
        
        console.log(`  ${batch.label}: ${students.length} students`)
        
        if (students.length === 30) {
          const first = rollNumbers[0]
          const last = rollNumbers[rollNumbers.length - 1]
          console.log(`    ✓ Roll Numbers: ${first} to ${last}`)
        } else {
          console.log(`    ⚠️  Expected 30, found ${students.length}`)
          console.log(`    Roll Numbers: ${rollNumbers.join(', ')}`)
        }
        
        totalCount += students.length
        allRollNumbers.push(...rollNumbers)
      }
    }
    
    console.log('\n' + '='.repeat(80))
    console.log(`\n📊 TOTAL STUDENTS: ${totalCount}`)
    
    if (totalCount === 360) {
      console.log('✅ SUCCESS: All 360 students created successfully!\n')
    } else {
      console.log(`❌ ERROR: Expected 360 students, found ${totalCount}\n`)
    }
    
    // Check for duplicates
    const duplicates = allRollNumbers.filter((item, index) => allRollNumbers.indexOf(item) !== index)
    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate roll numbers:`, duplicates)
    } else {
      console.log('✅ No duplicate roll numbers found')
    }
    
    // Verify roll number format
    const invalidRolls = allRollNumbers.filter(roll => !roll.match(/^\d{2}D(CS|CE|IT)\d{3}$/))
    if (invalidRolls.length > 0) {
      console.log(`⚠️  Found ${invalidRolls.length} invalid roll numbers:`, invalidRolls)
    } else {
      console.log('✅ All roll numbers have correct format')
    }
    
    console.log('\n✨ Verification complete!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 MongoDB connection closed\n')
  }
}

verifyAllStudents()
