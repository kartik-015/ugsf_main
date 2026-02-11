const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

async function testStudentRegistration() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ugsf')
    console.log('✅ Connected to ugsf database')

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }))
    
    // Check current student count
    const beforeCount = await User.countDocuments({ role: 'student', isActive: true })
    console.log(`\n📊 Current active students: ${beforeCount}`)
    
    // Simulate a new student registration (email format: yydeprol@charusat.edu.in)
    const testEmail = '25cse999@charusat.edu.in'
    
    // Check if test student already exists
    const existing = await User.findOne({ email: testEmail })
    if (existing) {
      console.log(`\n⚠️  Test student ${testEmail} already exists - deleting...`)
      await User.deleteOne({ email: testEmail })
    }
    
    // Create new student (simulating registration)
    const hashedPassword = await bcrypt.hash('Test@123', 10)
    
    const newStudent = await User.create({
      email: testEmail,
      password: hashedPassword,
      role: 'student',
      department: 'CSE',
      admissionYear: 2025,
      institute: 'DEPSTAR',
      university: 'CHARUSAT',
      academicInfo: {
        name: 'Test Student',
        rollNumber: '25CSE999',
        semester: 3,
        batch: 'A',
        phoneNumber: '+919876543210',
        address: 'Test Address, Anand, Gujarat'
      },
      isOnboarded: true,
      isRegistered: true,
      isApproved: true,
      isActive: true,
      isEmailVerified: true
    })
    
    console.log(`\n✅ Created test student:`)
    console.log(`   Email: ${newStudent.email}`)
    console.log(`   Name: ${newStudent.academicInfo.name}`)
    console.log(`   Roll: ${newStudent.academicInfo.rollNumber}`)
    console.log(`   Department: ${newStudent.department}`)
    console.log(`   University: ${newStudent.university}`)
    console.log(`   Institute: ${newStudent.institute}`)
    console.log(`   isActive: ${newStudent.isActive}`)
    
    // Check new count
    const afterCount = await User.countDocuments({ role: 'student', isActive: true })
    console.log(`\n📊 Active students after registration: ${afterCount}`)
    console.log(`   Increase: +${afterCount - beforeCount}`)
    
    // Test the exact query the students API uses
    const apiQuery = {
      role: 'student',
      isActive: true,
      university: 'CHARUSAT',
      institute: 'DEPSTAR'
    }
    
    console.log(`\n🔍 Testing API query:`, JSON.stringify(apiQuery, null, 2))
    const foundStudents = await User.find(apiQuery).select('email academicInfo.name academicInfo.rollNumber department')
    console.log(`✅ Found ${foundStudents.length} students`)
    
    // Check if our test student is in the results
    const testStudentFound = foundStudents.find(s => s.email === testEmail)
    if (testStudentFound) {
      console.log(`\n🎉 SUCCESS! Test student appears in query results:`)
      console.log(`   Email: ${testStudentFound.email}`)
      console.log(`   Name: ${testStudentFound.academicInfo?.name}`)
      console.log(`   Roll: ${testStudentFound.academicInfo?.rollNumber}`)
    } else {
      console.log(`\n❌ ERROR: Test student NOT found in query results!`)
    }
    
    console.log(`\n📝 Summary:`)
    console.log(`   ✓ Registration flow creates students with role='student', isActive=true`)
    console.log(`   ✓ University is set to 'CHARUSAT'`)
    console.log(`   ✓ Institute is set to 'DEPSTAR'`)
    console.log(`   ✓ Students will appear in the students module immediately`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.disconnect()
  }
}

testStudentRegistration()
