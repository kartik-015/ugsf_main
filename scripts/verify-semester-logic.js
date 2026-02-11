const mongoose = require('mongoose')

async function verifySemesterLogic() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ugsf')
    console.log('✅ Connected to ugsf database')

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }))
    
    console.log('\n📊 SEMESTER DISTRIBUTION BY ADMISSION YEAR')
    console.log('═══════════════════════════════════════════════\n')
    
    const admissionYears = [2022, 2023, 2024, 2025]
    const expectedSemesters = {
      2022: { semester: 8, year: '4th Year' },
      2023: { semester: 6, year: '3rd Year' },
      2024: { semester: 4, year: '2nd Year' },
      2025: { semester: 2, year: '1st Year' }
    }
    
    let totalStudents = 0
    let correctSemesters = 0
    
    for (const year of admissionYears) {
      const expected = expectedSemesters[year]
      
      // Get all students for this year
      const allStudents = await User.find({ 
        role: 'student', 
        admissionYear: year 
      }).select('email academicInfo.semester')
      
      // Get students with correct semester
      const correctStudents = await User.countDocuments({
        role: 'student',
        admissionYear: year,
        'academicInfo.semester': expected.semester
      })
      
      // Get students with wrong semester
      const wrongSemesterStudents = await User.find({
        role: 'student',
        admissionYear: year,
        'academicInfo.semester': { $ne: expected.semester }
      }).select('email academicInfo.semester').limit(3)
      
      totalStudents += allStudents.length
      correctSemesters += correctStudents
      
      console.log(`📅 Admission Year ${year} (${expected.year}):`)
      console.log(`   Expected Semester: ${expected.semester}`)
      console.log(`   Total Students: ${allStudents.length}`)
      console.log(`   ✅ Correct Semester: ${correctStudents}`)
      
      if (wrongSemesterStudents.length > 0) {
        console.log(`   ❌ Wrong Semester: ${wrongSemesterStudents.length}`)
        wrongSemesterStudents.forEach(s => {
          console.log(`      - ${s.email}: Semester ${s.academicInfo?.semester}`)
        })
      }
      console.log()
    }
    
    console.log('═══════════════════════════════════════════════')
    console.log(`\n📊 SUMMARY:`)
    console.log(`   Total Students: ${totalStudents}`)
    console.log(`   Correct Semesters: ${correctSemesters} (${Math.round(correctSemesters/totalStudents*100)}%)`)
    console.log(`   Wrong Semesters: ${totalStudents - correctSemesters}`)
    
    if (correctSemesters === totalStudents) {
      console.log(`\n✅ SUCCESS! All students have correct semesters based on admission year!`)
    } else {
      console.log(`\n⚠️  Some students still have incorrect semesters. Run update-semesters.js again.`)
    }
    
    console.log('\n📝 LOGIC:')
    console.log('   - 2022 admission (4th Year) → Semester 8')
    console.log('   - 2023 admission (3rd Year) → Semester 6')
    console.log('   - 2024 admission (2nd Year) → Semester 4')
    console.log('   - 2025 admission (1st Year) → Semester 2')
    console.log('   - All students in same year have same semester (even semester)')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.disconnect()
  }
}

verifySemesterLogic()
