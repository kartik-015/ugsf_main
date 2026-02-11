import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

const userSchema = new mongoose.Schema({}, { timestamps: true, strict: false })

async function checkAdmin() {
  try {
    await mongoose.connect(MONGODB_URI)
    const User = mongoose.models.User || mongoose.model('User', userSchema)

    const admin = await User.findOne({ email: 'admin@charusat.ac.in' }).lean()
    
    console.log('System Administrator account details:\n')
    console.log({
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      isOnboarded: admin.isOnboarded,
      isApproved: admin.isApproved,
      approvalStatus: admin.approvalStatus,
      university: admin.university,
      institute: admin.institute,
      department: admin.department
    })

    // Test query as this admin would run
    const query = { 
      role: 'student', 
      isActive: true,
      university: 'CHARUSAT',
      institute: 'DEPSTAR'
    }
    
    const count = await User.countDocuments(query)
    console.log(`\n✅ Students matching query: ${count}`)

    await mongoose.connection.close()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkAdmin()
