const mongoose = require('mongoose')

async function checkAdmin() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ugsf')
    console.log('✅ Connected to ugsf database')

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }))
    
    // Check for admin users
    const admins = await User.find({ 
      role: { $in: ['admin', 'mainadmin'] } 
    }).select('email role')
    
    console.log('\n📋 Admin users in ugsf database:')
    if (admins.length === 0) {
      console.log('❌ NO ADMIN USERS FOUND')
    } else {
      admins.forEach(admin => {
        console.log(`  - ${admin.email} (${admin.role})`)
      })
    }
    
    // Check total users
    const totalUsers = await User.countDocuments()
    const students = await User.countDocuments({ role: 'student' })
    
    console.log(`\n📊 Total users: ${totalUsers}`)
    console.log(`   Students: ${students}`)
    console.log(`   Others: ${totalUsers - students}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.disconnect()
  }
}

checkAdmin()
