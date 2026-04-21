import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import User from '../src/models/User.js'

async function ensureHODs() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  // HODs that should exist
  const hodData = [
    { email: 'hod.csds@charusat.ac.in', department: 'CSE', name: 'Amit Nayak' },
    { email: 'hod.ceds@charusat.ac.in', department: 'CE', name: 'Chirag Patel' },
    { email: 'hod.itds@charusat.ac.in', department: 'IT', name: 'Dweepna Garg' },
  ]

  for (const hod of hodData) {
    let user = await User.findOne({ email: hod.email })
    if (user) {
      // Normalize canonical HOD account
      user.academicInfo = { ...(user.academicInfo || {}), name: hod.name }
      user.institute = 'DEPSTAR'
      user.department = hod.department
      user.role = 'hod'
      user.password = 'depstar@123'
      user.mustChangePassword = true
      user.isOnboarded = true
      user.isEmailVerified = true
      user.isApproved = true
      user.approvalStatus = 'approved'
      user.isActive = true
      await user.save()
      console.log(`Updated: ${hod.email} -> "${hod.name}" (${hod.department}, DEPSTAR)`)
    } else {
      // Create the HOD
      user = new User({
        email: hod.email,
        password: 'depstar@123',
        role: 'hod',
        department: hod.department,
        institute: 'DEPSTAR',
        academicInfo: { name: hod.name, phoneNumber: '0000000000', address: 'DEPSTAR, Charusat University' },
        isOnboarded: true,
        isEmailVerified: true,
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        mustChangePassword: true,
      })
      await user.save()
      console.log(`Created: ${hod.email} -> "${hod.name}" (${hod.department}, DEPSTAR)`)
    }
  }

  // Also ensure PCs and admin/principal have institute DEPSTAR
  const otherSeeds = ['admin@charusat.edu.in','principal@charusat.ac.in','pccse@charusat.ac.in','pcce@charusat.ac.in','pcit@charusat.ac.in']
  for (const email of otherSeeds) {
    const u = await User.findOne({ email })
    if (u) {
      u.institute = 'DEPSTAR'
      await u.save()
      console.log(`Set institute DEPSTAR: ${email}`)
    }
  }

  // Final check
  const allHods = await User.find({ role: 'hod' }).select('email department academicInfo.name institute')
  console.log('\n=== Final HODs ===')
  allHods.forEach(h => console.log(h.email, '|', h.department, '|', h.academicInfo?.name, '| inst:', h.institute))

  await mongoose.disconnect()
  console.log('\nDone!')
}

ensureHODs().catch(console.error)
