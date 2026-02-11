import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  department: String,
}, { timestamps: true, strict: false })

async function checkAdmin() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected\n')

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // Find admin users
    const admins = await User.find({ role: 'admin' }).select('email role department').lean()
    
    console.log('Admin users:')
    admins.forEach(admin => {
      console.log({
        email: admin.email,
        role: admin.role,
        department: admin.department || '(not set)'
      })
    })

    await mongoose.connection.close()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkAdmin()
