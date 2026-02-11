import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

const userSchema = new mongoose.Schema({}, { timestamps: true, strict: false })

async function testExactQuery() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected\n')

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // Test 1: Query with all filters (as frontend sends)
    console.log('TEST 1: With university and institute filters')
    const query1 = {
      role: 'student',
      isActive: true,
      university: 'CHARUSAT',
      institute: 'DEPSTAR'
    }
    const count1 = await User.countDocuments(query1)
    console.log('Query:', query1)
    console.log('Result:', count1, 'students\n')

    // Test 2: Query without filters
    console.log('TEST 2: Without university/institute filters')
    const query2 = {
      role: 'student',
      isActive: true
    }
    const count2 = await User.countDocuments(query2)
    console.log('Query:', query2)
    console.log('Result:', count2, 'students\n')

    // Test 3: Check actual data
    console.log('TEST 3: Sample student data')
    const sample = await User.findOne({ role: 'student', isActive: true }).lean()
    console.log(JSON.stringify({
      email: sample.email,
      role: sample.role,
      isActive: sample.isActive,
      university: sample.university,
      institute: sample.institute,
      department: sample.department
    }, null, 2))

    await mongoose.connection.close()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

testExactQuery()
