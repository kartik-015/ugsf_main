const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

async function createAdmin() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ugsf')
    console.log('✅ Connected to ugsf database')

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }))
    
    // Check if admin@charusat.edu.in already exists
    const existing = await User.findOne({ email: 'admin@charusat.edu.in' })
    if (existing) {
      console.log('⚠️  Admin with admin@charusat.edu.in already exists')
      console.log('   Email:', existing.email)
      console.log('   Role:', existing.role)
      return
    }
    
    // Create new admin
    const hashedPassword = await bcrypt.hash('charusat@123', 10)
    
    const admin = await User.create({
      email: 'admin@charusat.edu.in',
      password: hashedPassword,
      role: 'admin',
      university: 'CHARUSAT',
      institute: 'DEPSTAR',
      isActive: true,
      isEmailVerified: true,
      isRegistered: true,
      isOnboarded: true,
      academicInfo: {
        name: 'System Administrator'
      }
    })
    
    console.log('✅ Admin user created successfully!')
    console.log('   Email: admin@charusat.edu.in')
    console.log('   Password: charusat@123')
    console.log('   Role:', admin.role)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.disconnect()
  }
}

createAdmin()
