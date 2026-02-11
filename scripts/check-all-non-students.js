import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

const userSchema = new mongoose.Schema({}, { timestamps: true, strict: false })

async function checkAllUsers() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected\n')

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // Find ALL non-student users
    const nonStudents = await User.find({ role: { $ne: 'student' } })
      .select('email role university institute academicInfo.name')
      .lean()
    
    console.log(`Total non-student users: ${nonStudents.length}\n`)
    nonStudents.forEach(u => {
      console.log({
        email: u.email,
        name: u.academicInfo?.name,
        role: u.role,
        university: u.university,
        institute: u.institute
      })
    })

    await mongoose.connection.close()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkAllUsers()
