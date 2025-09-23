require('dotenv').config({ path: '.env.local' })
const mongoose = require('mongoose')

async function run() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI not set')
    process.exit(1)
  }
  const retainEmail = process.env.RETAIN_ADMIN_EMAIL && process.env.RETAIN_ADMIN_EMAIL.toLowerCase()
  const dryRun = /^true$/i.test(process.env.DRY_RUN || '')

  await mongoose.connect(uri)
  try {
    let filter
    let preserveDescription

    if (retainEmail) {
      const adminDoc = await mongoose.connection.collection('users').findOne({ email: retainEmail, role: 'admin' })
      if (!adminDoc) {
        console.error(`Admin with email ${retainEmail} not found. Aborting.`)
        process.exit(2)
      }
      filter = { _id: { $ne: adminDoc._id } }
      preserveDescription = `single admin ${retainEmail}`
    } else {
      // Keep all users whose role === 'admin'
      filter = { role: { $ne: 'admin' } }
      preserveDescription = 'all admin users'
    }

    const total = await mongoose.connection.collection('users').countDocuments()
    const willDelete = await mongoose.connection.collection('users').countDocuments(filter)

    console.log(`Total users: ${total}`)
    console.log(`Will preserve: ${total - willDelete} (${preserveDescription})`)
    console.log(`Will delete: ${willDelete}`)

    if (willDelete === 0) {
      console.log('Nothing to delete. Exiting.')
      return
    }

    if (dryRun) {
      console.log('DRY_RUN=true set. Skipping deletion.')
      return
    }

    const res = await mongoose.connection.collection('users').deleteMany(filter)
    console.log(`Deleted ${res.deletedCount} users.`)
    console.log('Prune complete.')
  } catch (e) {
    console.error('Error during prune:', e)
  } finally {
    await mongoose.disconnect()
  }
}

run()
