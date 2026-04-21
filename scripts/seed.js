const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
require('dotenv').config({ path: '.env.local' })

let User

async function importModels() {
  const UserModule = await import('../src/models/User.js')
  User = UserModule.default
}

async function seed() {
  try {
    await importModels()
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/evalprox')
    console.log('Connected to MongoDB')

    await User.deleteMany({})
    console.log('Cleared existing data')

    const users = [
      {
        email: 'admin@charusat.edu.in',
        password: 'charusat@123',
        role: 'admin',
        academicInfo: { name: 'System Administrator', phoneNumber: '1234567890', address: 'Charusat University' },
      },
      {
        email: 'principal@charusat.ac.in',
        password: 'charusat@123',
        role: 'principal',
        academicInfo: { name: 'Principal', phoneNumber: '1234567891', address: 'Charusat University' },
      },
      {
        email: 'amitnayak.cse@charusat.ac.in',
        password: 'charusat@123',
        role: 'hod',
        department: 'CSE',
        academicInfo: { name: 'Amit Nayak', phoneNumber: '1234567892', address: 'Charusat University' },
      },
      {
        email: 'chiragpatel.ce@charusat.ac.in',
        password: 'charusat@123',
        role: 'hod',
        department: 'CE',
        academicInfo: { name: 'Chirag Patel', phoneNumber: '1234567893', address: 'Charusat University' },
      },
      {
        email: 'dweepnagarg.it@charusat.ac.in',
        password: 'charusat@123',
        role: 'hod',
        department: 'IT',
        academicInfo: { name: 'Dweepna Garg', phoneNumber: '1234567894', address: 'Charusat University' },
      },
      {
        email: 'pccse@charusat.ac.in',
        password: 'charusat@123',
        role: 'project_coordinator',
        department: 'CSE',
        academicInfo: { name: 'Project Coordinator CSE', phoneNumber: '1234567895', address: 'Charusat University' },
      },
      {
        email: 'pcce@charusat.ac.in',
        password: 'charusat@123',
        role: 'project_coordinator',
        department: 'CE',
        academicInfo: { name: 'Project Coordinator CE', phoneNumber: '1234567896', address: 'Charusat University' },
      },
      {
        email: 'pcit@charusat.ac.in',
        password: 'charusat@123',
        role: 'project_coordinator',
        department: 'IT',
        academicInfo: { name: 'Project Coordinator IT', phoneNumber: '1234567897', address: 'Charusat University' },
      }
    ]
    for (const userData of users) {
      const user = new User({
        ...userData,
        institute: 'DEPSTAR',
        isOnboarded: true,
        isEmailVerified: true,
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
      })
      await user.save()
      console.log(`Created user: ${user.email} (${user.role})`)
    }

    console.log('\nDatabase seeded successfully!')
    console.log('\nLogin Credentials:')
    console.log('Admin: admin@charusat.edu.in / charusat@123')
    console.log('Principal: principal@charusat.ac.in / charusat@123')
    console.log('HOD CSE: amitnayak.cse@charusat.ac.in / charusat@123')
    console.log('HOD CE: chiragpatel.ce@charusat.ac.in / charusat@123')
    console.log('HOD IT: dweepnagarg.it@charusat.ac.in / charusat@123')
    console.log('PC CSE: pccse@charusat.ac.in / charusat@123')
    console.log('PC CE: pcce@charusat.ac.in / charusat@123')
    console.log('PC IT: pcit@charusat.ac.in / charusat@123')

  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

seed()