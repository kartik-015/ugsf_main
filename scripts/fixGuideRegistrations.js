import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import User from '../src/models/User.js'

async function fixGuideRegistrations() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('ERROR: MONGODB_URI not found in .env.local')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  // Fix all non-student accounts that are not registered/active
  const result = await User.updateMany(
    {
      role: { $in: ['guide', 'admin', 'hod', 'principal', 'pc'] },
      $or: [
        { isRegistered: false },
        { isRegistered: { $exists: false } },
        { isApproved: false },
        { isActive: false },
      ]
    },
    {
      $set: {
        isRegistered: true,
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        isEmailVerified: true,
        isOnboarded: true,
      }
    }
  )

  console.log(`\n✅ Fixed ${result.modifiedCount} accounts (matched: ${result.matchedCount})`)

  // Show current state of all guides
  const guides = await User.find({ role: 'guide' }).select('email isRegistered isApproved isActive approvalStatus')
  console.log('\n📋 All Guide accounts:')
  guides.forEach(g => {
    console.log(`  ${g.email} | registered:${g.isRegistered} | approved:${g.isApproved} | active:${g.isActive} | status:${g.approvalStatus}`)
  })

  await mongoose.disconnect()
  console.log('\nDone.')
}

fixGuideRegistrations().catch(e => {
  console.error(e)
  process.exit(1)
})
