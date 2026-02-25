import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import User from '../src/models/User.js'
import ProjectGroup from '../src/models/ProjectGroup.js'
import Notification from '../src/models/Notification.js'
import PrincipalChat from '../src/models/PrincipalChat.js'
import ReportFile from '../src/models/ReportFile.js'
import Rubric from '../src/models/Rubric.js'

async function fullCleanup() {
  const uri = process.env.MONGODB_URI
  if (!uri) { console.error('No MONGODB_URI'); process.exit(1) }

  await mongoose.connect(uri)
  console.log('Connected to MongoDB:', uri.replace(/\/\/.*@/, '//***@'))

  // Step 1: Delete ALL projects, notifications, chats, reports, rubrics
  const delProjects = await ProjectGroup.deleteMany({})
  console.log(`Deleted ${delProjects.deletedCount} project groups`)
  
  try { const d = await Notification.deleteMany({}); console.log(`Deleted ${d.deletedCount} notifications`) } catch(e) { console.log('No notifications collection') }
  try { const d = await PrincipalChat.deleteMany({}); console.log(`Deleted ${d.deletedCount} principal chats`) } catch(e) { console.log('No principal chats collection') }
  try { const d = await ReportFile.deleteMany({}); console.log(`Deleted ${d.deletedCount} report files`) } catch(e) { console.log('No report files collection') }
  try { const d = await Rubric.deleteMany({}); console.log(`Deleted ${d.deletedCount} rubrics`) } catch(e) { console.log('No rubrics collection') }

  // Step 2: Delete ALL users except admin
  const delUsers = await User.deleteMany({ email: { $ne: 'admin@charusat.edu.in' } })
  console.log(`Deleted ${delUsers.deletedCount} non-admin users`)

  // Step 3: Ensure admin is fully active
  await User.updateOne(
    { email: 'admin@charusat.edu.in' },
    { $set: { isRegistered: true, isApproved: true, approvalStatus: 'approved', isActive: true, isEmailVerified: true, isOnboarded: true } }
  )
  console.log('Admin account ensured')

  // Step 4: Create 3 HOD accounts
  const hods = [
    { email: 'dweepnagarg.ce@charusat.ac.in', password: 'Xk9$mR2vLpQ7#nT4', role: 'hod', department: 'IT', academicInfo: { name: 'Dweepna Garg', phoneNumber: '0000000000', address: 'DEPSTAR, CHARUSAT' } },
    { email: 'amitnayak.it@charusat.ac.in', password: 'Wf5&jK8sZdN3@bY6', role: 'hod', department: 'CSE', academicInfo: { name: 'Amit Nayak', phoneNumber: '0000000000', address: 'DEPSTAR, CHARUSAT' } },
    { email: 'chiragpatel.cse@charusat.ac.in', password: 'Hm7^tP4wCqR9!eU2', role: 'hod', department: 'CE', academicInfo: { name: 'Chirag Patel', phoneNumber: '0000000000', address: 'DEPSTAR, CHARUSAT' } },
  ]

  for (const hod of hods) {
    await User.deleteOne({ email: hod.email })
    const user = new User({
      ...hod,
      institute: 'DEPSTAR',
      university: 'CHARUSAT',
      isOnboarded: true,
      isRegistered: true,
      isEmailVerified: true,
      isApproved: true,
      approvalStatus: 'approved',
      isActive: true,
      mustChangePassword: true,
    })
    await user.save()
    console.log(`Created HOD: ${hod.email} (${hod.department})`)
  }

  // Final check
  const allUsers = await User.find().select('email role department isRegistered isActive').lean()
  console.log('\n=== Final state ===')
  allUsers.forEach(u => console.log(`  ${u.email} | ${u.role} | dept:${u.department || '-'} | reg:${u.isRegistered} | active:${u.isActive}`))
  console.log(`Total users: ${allUsers.length}`)

  await mongoose.disconnect()
  console.log('\nDone.')
}

fullCleanup().catch(e => { console.error(e); process.exit(1) })
