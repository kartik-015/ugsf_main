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
        password: 'depstar@123',
        role: 'admin',
        academicInfo: { name: 'System Administrator', phoneNumber: '1234567890', address: 'Charusat University' },
      },
      {
        email: 'principal@charusat.ac.in',
        password: 'depstar@123',
        role: 'principal',
        academicInfo: { name: 'Principal', phoneNumber: '1234567891', address: 'Charusat University' },
      },
      {
        email: 'hod.csds@charusat.ac.in',
        password: 'depstar@123',
        role: 'hod',
        department: 'CSE',
        academicInfo: { name: 'Amit Nayak', phoneNumber: '1234567892', address: 'Charusat University' },
      },
      {
        email: 'hod.ceds@charusat.ac.in',
        password: 'depstar@123',
        role: 'hod',
        department: 'CE',
        academicInfo: { name: 'Chirag Patel', phoneNumber: '1234567893', address: 'Charusat University' },
      },
      {
        email: 'hod.itds@charusat.ac.in',
        password: 'depstar@123',
        role: 'hod',
        department: 'IT',
        academicInfo: { name: 'Dweepna Garg', phoneNumber: '1234567894', address: 'Charusat University' },
      },
      {
        email: 'pccse@charusat.ac.in',
        password: 'depstar@123',
        role: 'project_coordinator',
        department: 'CSE',
        academicInfo: { name: 'Project Coordinator CSE', phoneNumber: '1234567895', address: 'Charusat University' },
      },
      {
        email: 'pcce@charusat.ac.in',
        password: 'depstar@123',
        role: 'project_coordinator',
        department: 'CE',
        academicInfo: { name: 'Project Coordinator CE', phoneNumber: '1234567896', address: 'Charusat University' },
      },
      {
        email: 'pcit@charusat.ac.in',
        password: 'depstar@123',
        role: 'project_coordinator',
        department: 'IT',
        academicInfo: { name: 'Project Coordinator IT', phoneNumber: '1234567897', address: 'Charusat University' },
      },
      {
        email: 'kartiktest.dit@charusat.ac.in',
        password: 'depstar@123',
        role: 'guide',
        department: 'IT',
        academicInfo: { name: 'Kartik Guleria (Test Guide)', phoneNumber: '1234567898', address: 'Charusat University' },
      }
    ]
    for (const userData of users) {
      const user = new User({
        ...userData,
        institute: 'DEPSTAR',
        isOnboarded: true,
        isRegistered: true,
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
    console.log('Admin: admin@charusat.edu.in / depstar@123')
    console.log('Principal: principal@charusat.ac.in / depstar@123')
    console.log('HOD CSE: hod.csds@charusat.ac.in / depstar@123')
    console.log('HOD CE: hod.ceds@charusat.ac.in / depstar@123')
    console.log('HOD IT: hod.itds@charusat.ac.in / depstar@123')
    console.log('PC CSE: pccse@charusat.ac.in / depstar@123')
    console.log('PC CE: pcce@charusat.ac.in / depstar@123')
    console.log('PC IT: pcit@charusat.ac.in / depstar@123')
    console.log('Guide IT (Test): kartiktest.dit@charusat.ac.in / depstar@123')

  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

seed()