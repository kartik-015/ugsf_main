require('dotenv').config({ path: '.env.local' })
const mongoose = require('mongoose')
const path = require('path')
const Module = require('module')

// Register @ alias for ESM imports from models
const origResolve = Module._resolveFilename
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', 'src', request.slice(2))
  }
  return origResolve.call(this, request, parent, isMain, options)
}

async function run() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI not set')
    process.exit(1)
  }
  await mongoose.connect(uri)

  try {
    const UserModule = await import('../src/models/User.js')
    const ProjectGroupModule = await import('../src/models/ProjectGroup.js')
    const User = UserModule.default
    const ProjectGroup = ProjectGroupModule.default

    // Find admin users to preserve
    const admins = await User.find({ role: { $in: ['admin', 'mainadmin', 'principal', 'hod', 'project_coordinator'] } })
    if (admins.length === 0) {
      console.error('No admin/faculty users found. Aborting.')
      process.exit(1)
    }

    const preservedIds = admins.map(a => a._id)
    console.log('Preserving admin/faculty users:')
    admins.forEach(a => console.log(`  ${a.email} (${a.role})`))

    // Delete all non-admin users
    const userResult = await User.deleteMany({ _id: { $nin: preservedIds } })
    console.log(`\nDeleted ${userResult.deletedCount} other users (students, guides)`)

    // Clear project groups
    const projectResult = await ProjectGroup.deleteMany({})
    console.log(`Deleted ${projectResult.deletedCount} project groups`)

    // Clear notifications and chats
    const db = mongoose.connection.db
    const notifResult = await db.collection('notifications').deleteMany({})
    console.log(`Deleted ${notifResult.deletedCount} notifications`)
    const chatResult = await db.collection('principalchats').deleteMany({})
    console.log(`Deleted ${chatResult.deletedCount} chats`)

    console.log('\nPrune complete. Only admin/faculty users remain.')
  } catch (e) {
    console.error('Error during prune:', e)
  } finally {
    await mongoose.disconnect()
  }
}

run()
