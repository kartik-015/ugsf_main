import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

const userSchema = new mongoose.Schema({}, { timestamps: true, strict: false })

async function findSystemAdmin() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected\n')

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // Find users with "System" or "Administrator" in academicInfo.name
    const admins = await User.find({
      $or: [
        { 'academicInfo.name': /System/i },
        { 'academicInfo.name': /Administrator/i },
        { email: /admin/i }
      ]
    }).select('email role academicInfo.name isActive').lean()

    console.log('Found potential admin users:')
    admins.forEach(admin => {
      console.log({
        email: admin.email,
        name: admin.academicInfo?.name,
        role: admin.role,
        isActive: admin.isActive
      })
    })

    // Also check for all non-student users
    console.log('\n\nAll non-student users:')
    const nonStudents = await User.find({ role: { $ne: 'student' } }).select('email role isActive').lean()
    nonStudents.forEach(u => {
      console.log(`  ${u.email} | role: ${u.role} | active: ${u.isActive}`)
    })

    await mongoose.connection.close()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

findSystemAdmin()
