/**
 * One-off migration script to map legacy roles to new role model.
 * Run with: node scripts/migrateRoles.js
 */
import dotenv from 'dotenv'
dotenv.config()
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

async function run() {
  await dbConnect()
  const mapping = {
    'faculty': 'guide',
    'counselor': 'guide',
    'hod': 'admin',
    'principal': 'admin'
  }
  const legacy = await User.find({ role: { $in: Object.keys(mapping) } })
  for (const u of legacy) {
    u.role = mapping[u.role]
    await u.save()
    console.log('Updated user', u.email, '->', u.role)
  }
  console.log('Migration complete.')
  process.exit(0)
}
run().catch(e => { console.error(e); process.exit(1) })
