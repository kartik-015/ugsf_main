/**
 * Database Correction Script
 * ==========================
 * Corrects guide name from "Chital Raval" to "Chintal Raval"
 * Updates email from "chitalraval.dit@charusat.ac.in" to "chintalraval.dit@charusat.ac.in"
 * 
 * Usage: npx tsx scripts/fixGuideSpelling.js
 */

require('dotenv').config({ path: '.env.local' })
const mongoose = require('mongoose')
const path = require('path')
const Module = require('module')

// Register @ alias for imports
const origResolve = Module._resolveFilename
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', 'src', request.slice(2))
  }
  return origResolve.call(this, request, parent, isMain, options)
}

let User

async function importModels() {
  const UserModule = await import('../src/models/User.js')
  User = UserModule.default?.default || UserModule.default || UserModule
}

async function fixGuideSpelling() {
  try {
    await importModels()
    
    const mongoUri = process.argv[2] || process.env.MONGODB_URI || 'mongodb://localhost:27017/evalprox'
    await mongoose.connect(mongoUri)
    console.log('✓ Connected to MongoDB\n')

    console.log('🔧 Fixing guide spelling: chital -> chintal\n')

    // Find and update the guide with wrong spelling
    const result = await User.findOneAndUpdate(
      {
        $or: [
          { email: 'chitalraval.dit@charusat.ac.in' },
          { 'academicInfo.name': /chital raval/i },
          { fullName: /chital raval/i },
          { displayName: /chital raval/i },
        ],
      },
      {
        email: 'chintalraval.dit@charusat.ac.in',
        academicInfo: {
          name: 'Chintal Raval'
        },
        fullName: 'Chintal Raval',
        displayName: 'Chintal Raval',
      },
      { new: true }
    )

    if (result) {
      console.log('✓ Updated guide:')
      console.log(`  From: chitalraval.dit@charusat.ac.in`)
      console.log(`  To:   chintalraval.dit@charusat.ac.in`)
      console.log(`  Name: ${result.academicInfo?.name}\n`)
    } else {
      console.log('⚠ No guide found with email: chitalraval.dit@charusat.ac.in')
      console.log('  Checking for existing correct spelling...\n')
      
      const existing = await User.findOne({ email: 'chintalraval.dit@charusat.ac.in' })
      if (existing) {
        console.log('✓ Guide already has correct spelling:')
        console.log(`  Email: ${existing.email}`)
        console.log(`  Name: ${existing.academicInfo?.name}\n`)
      } else {
        console.log('✗ Neither spelling found in database\n')
      }
    }

    // Show all guides
    console.log('📋 All current guides in database:')
    const guides = await User.find({ role: 'guide' }).select('email academicInfo.name').lean()
    guides.forEach((guide, index) => {
      console.log(`  ${index + 1}. ${guide.email} - ${guide.academicInfo?.name || '(No name)'}`)
    })
    console.log()

    await mongoose.connection.close()
    console.log('✓ Database connection closed')
    process.exit(0)
  } catch (err) {
    console.error('✗ Error:', err.message)
    process.exit(1)
  }
}

fixGuideSpelling()
