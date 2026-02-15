import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import User from '../src/models/User.js'

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  // 1. Show all HODs
  const allHods = await User.find({ role: 'hod' }).select('email department academicInfo.name')
  console.log('\n=== ALL HODs ===')
  allHods.forEach(h => console.log(h._id.toString(), '|', h.email, '|', h.department, '|', h.academicInfo?.name))

  // 2. The 3 seed HODs to keep
  const keepEmails = ['hodit@charusat.ac.in', 'hodcse@charusat.ac.in', 'hodce@charusat.ac.in']

  // 3. Delete duplicate HODs (imported from real data)
  const dupes = await User.find({ role: 'hod', email: { $nin: keepEmails } })
  console.log(`\n=== Removing ${dupes.length} duplicate HODs ===`)
  for (const d of dupes) {
    console.log('  Removing:', d.email, '|', d.department, '|', d.academicInfo?.name)
    await User.deleteOne({ _id: d._id })
  }

  // 4. Update the 3 kept HODs with proper DEPSTAR names
  const hodUpdates = {
    'hodit@charusat.ac.in': 'HOD IT',
    'hodcse@charusat.ac.in': 'HOD CSE',
    'hodce@charusat.ac.in': 'HOD CE',
  }

  for (const [email, name] of Object.entries(hodUpdates)) {
    const hod = await User.findOne({ email })
    if (hod) {
      hod.academicInfo = { ...hod.academicInfo, name }
      hod.institute = 'DEPSTAR'
      await hod.save()
      console.log(`  Updated ${email} -> name: "${name}", institute: DEPSTAR`)
    }
  }

  // 5. Verify remaining HODs
  const remaining = await User.find({ role: 'hod' }).select('email department academicInfo.name institute')
  console.log('\n=== FINAL HODs ===')
  remaining.forEach(h => console.log(h.email, '|', h.department, '|', h.academicInfo?.name, '| inst:', h.institute))

  // 6. Check all guides are DEPSTAR
  const guides = await User.find({ role: 'guide' }).select('email department institute academicInfo.name')
  console.log(`\n=== ${guides.length} Guides ===`)
  guides.forEach(g => console.log(g.email, '|', g.department, '| inst:', g.institute, '|', g.academicInfo?.name))

  await mongoose.disconnect()
  console.log('\nDone!')
}

cleanup().catch(console.error)
