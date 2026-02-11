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

async function checkFilters() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected\n')

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // Check total students
    const totalStudents = await User.countDocuments({ role: 'student' })
    console.log(`Total students: ${totalStudents}`)

    // Check active students
    const activeStudents = await User.countDocuments({ role: 'student', isActive: true })
    console.log(`Active students: ${activeStudents}`)

    // Check students with CHARUSAT
    const charusatStudents = await User.countDocuments({ role: 'student', university: 'CHARUSAT' })
    console.log(`Students with CHARUSAT: ${charusatStudents}`)

    // Check students with DEPSTAR
    const depstarStudents = await User.countDocuments({ role: 'student', institute: 'DEPSTAR' })
    console.log(`Students with DEPSTAR: ${depstarStudents}`)

    // Check students with both
    const bothFilters = await User.countDocuments({ 
      role: 'student', 
      isActive: true,
      university: 'CHARUSAT',
      institute: 'DEPSTAR'
    })
    console.log(`Students with role=student, isActive=true, university=CHARUSAT, institute=DEPSTAR: ${bothFilters}`)

    // Sample student data
    console.log('\nSample student:')
    const sample = await User.findOne({ role: 'student' }).lean()
    console.log({
      email: sample.email,
      role: sample.role,
      university: sample.university,
      institute: sample.institute,
      isActive: sample.isActive,
      department: sample.department
    })

    await mongoose.connection.close()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkFilters()
