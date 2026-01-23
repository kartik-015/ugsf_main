/**
 * Force refresh script - clears Next.js cache and verifies data
 */

import { rm } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

console.log('🔄 Force Refresh Script\n')
console.log('='.repeat(60))

// Clear Next.js cache
async function clearCache() {
  const cachePaths = [
    '.next/cache',
    '.next/server',
  ]
  
  console.log('\n🗑️  Clearing Next.js cache...')
  for (const path of cachePaths) {
    if (existsSync(path)) {
      try {
        await rm(path, { recursive: true, force: true })
        console.log(`  ✓ Cleared: ${path}`)
      } catch (e) {
        console.log(`  ⚠️  Could not clear: ${path}`)
      }
    }
  }
}

// Verify database
async function verifyDB() {
  try {
    console.log('\n📊 Verifying database...')
    await mongoose.connect(MONGODB_URI)
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }))
    
    const studentCount = await User.countDocuments({ role: 'student' })
    const allCount = await User.countDocuments()
    
    console.log(`  Total Users: ${allCount}`)
    console.log(`  Students: ${studentCount}`)
    
    if (studentCount === 360) {
      console.log('  ✅ Database has correct 360 students')
    } else {
      console.log(`  ❌ Expected 360 students, found ${studentCount}`)
    }
    
    await mongoose.connection.close()
  } catch (error) {
    console.error('  ❌ Database error:', error.message)
  }
}

async function main() {
  await clearCache()
  await verifyDB()
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Refresh complete!')
  console.log('\nNext steps:')
  console.log('1. Restart your Next.js dev server (Ctrl+C then npm run dev)')
  console.log('2. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)')
  console.log('3. Open browser DevTools and check the Network tab')
  console.log('4. Navigate to Admin Dashboard')
  console.log('='.repeat(60))
}

main()
