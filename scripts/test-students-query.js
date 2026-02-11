import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  university: String,
  institute: String,
  isActive: Boolean,
  department: String,
}, { timestamps: true, strict: false })

async function testQuery() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected\n')

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // Simulate the exact query that would be run
    const query = { 
      role: 'student', 
      isActive: true,
      university: 'CHARUSAT',
      institute: 'DEPSTAR'
    }

    console.log('Testing query:', JSON.stringify(query, null, 2))
    
    const students = await User.find(query).select('email role university institute isActive department').limit(5).lean()
    
    console.log(`\nFound ${students.length} students (showing first 5):\n`)
    students.forEach(s => {
      console.log({
        email: s.email,
        role: s.role,
        university: s.university,
        institute: s.institute,
        isActive: s.isActive,
        department: s.department
      })
    })

    // Count total that match
    const total = await User.countDocuments(query)
    console.log(`\n✅ Total matching students: ${total}`)

    await mongoose.connection.close()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

testQuery()
