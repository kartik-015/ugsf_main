const mongoose = require('mongoose')

async function updateStudentSemesters() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ugsf')
    console.log('✅ Connected to ugsf database')

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }))
    
    const currentYear = 2026
    
    // Get all students
    const students = await User.find({ role: 'student' }).select('email admissionYear academicInfo')
    
    console.log(`\n📊 Found ${students.length} students`)
    console.log(`📅 Current Year: ${currentYear}`)
    console.log(`\n🔄 Calculating semesters based on admission year...\n`)
    
    const updates = {
      2025: { year: 1, semester: 2, count: 0 }, // 1st year -> Sem 2
      2024: { year: 2, semester: 4, count: 0 }, // 2nd year -> Sem 4
      2023: { year: 3, semester: 6, count: 0 }, // 3rd year -> Sem 6
      2022: { year: 4, semester: 8, count: 0 }, // 4th year -> Sem 8
    }
    
    let updated = 0
    
    for (const student of students) {
      const admissionYear = student.admissionYear
      
      if (!admissionYear) {
        console.log(`⚠️  ${student.email} - No admission year, skipping`)
        continue
      }
      
      const yearData = updates[admissionYear]
      
      if (!yearData) {
        console.log(`⚠️  ${student.email} - Unknown admission year ${admissionYear}, skipping`)
        continue
      }
      
      const newSemester = yearData.semester
      const oldSemester = student.academicInfo?.semester
      
      // Update the student
      await User.updateOne(
        { _id: student._id },
        { 
          $set: { 
            'academicInfo.semester': newSemester 
          } 
        }
      )
      
      yearData.count++
      updated++
      
      if (yearData.count <= 3) {
        console.log(`✓ ${student.email} - Admission ${admissionYear} (Year ${yearData.year}) - Sem ${oldSemester || '?'} → ${newSemester}`)
      }
    }
    
    console.log(`\n📊 UPDATE SUMMARY:`)
    console.log(`════════════════════════════════════════════════`)
    Object.entries(updates).forEach(([year, data]) => {
      if (data.count > 0) {
        console.log(`  Admission ${year} (Year ${data.year}) → Semester ${data.semester}: ${data.count} students`)
      }
    })
    console.log(`════════════════════════════════════════════════`)
    console.log(`✅ Total updated: ${updated} students\n`)
    
    // Verify the changes
    console.log(`🔍 Verification:`)
    for (const [year, data] of Object.entries(updates)) {
      if (data.count > 0) {
        const count = await User.countDocuments({
          role: 'student',
          admissionYear: parseInt(year),
          'academicInfo.semester': data.semester
        })
        console.log(`  ✓ Year ${year}: ${count} students in semester ${data.semester}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.disconnect()
  }
}

updateStudentSemesters()
