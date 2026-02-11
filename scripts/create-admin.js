import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

const userSchema = new mongoose.Schema({}, { timestamps: true, strict: false })

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB\n')

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // Check if admin already exists
    const existing = await User.findOne({ email: 'admin@charusat.ac.in' })
    if (existing) {
      console.log('✅ Admin already exists:', existing.email)
      console.log('   Role:', existing.role)
      console.log('   Active:', existing.isActive)
      console.log('   Onboarded:', existing.isOnboarded)
      await mongoose.connection.close()
      return
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 10)
    
    const admin = new User({
      email: 'admin@charusat.ac.in',
      password: hashedPassword,
      role: 'admin',
      university: 'CHARUSAT',
      institute: 'DEPSTAR',
      academicInfo: {
        name: 'System Administrator',
        phoneNumber: '+919876543210',
        address: 'DEPSTAR, CHARUSAT, Anand, Gujarat'
      },
      specialization: 'System Administration',
      education: 'M.Tech',
      isOnboarded: true,
      isRegistered: true,
      isActive: true,
      isEmailVerified: true,
      isApproved: true,
      approvalStatus: 'approved'
    })

    await admin.save()
    
    console.log('✅ Created admin user successfully!')
    console.log('   Email: admin@charusat.ac.in')
    console.log('   Password: Admin@123')
    console.log('   Role: admin')
    console.log('\n👉 Please login with these credentials')

    await mongoose.connection.close()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

createAdmin()
