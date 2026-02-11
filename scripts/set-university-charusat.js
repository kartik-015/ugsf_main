import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

// Define User Schema (minimal for this migration)
const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  university: String,
}, { timestamps: true, strict: false })

async function setUniversityCHARUSAT() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // Update all users with full university name to short form 'CHARUSAT'
    const result = await User.updateMany(
      { university: 'Charotar University of Science and Technology' },
      { $set: { university: 'CHARUSAT' } }
    )

    console.log(`✅ Updated ${result.modifiedCount} users to have university='CHARUSAT'`)

    // Also update any users with null/missing/empty university
    const result2 = await User.updateMany(
      { $or: [{ university: { $exists: false } }, { university: null }, { university: '' }] },
      { $set: { university: 'CHARUSAT' } }
    )

    console.log(`✅ Updated ${result2.modifiedCount} additional users with missing university`)

    // Count total users with CHARUSAT
    const totalCHARUSAT = await User.countDocuments({ university: 'CHARUSAT' })
    console.log(`📊 Total users with university='CHARUSAT': ${totalCHARUSAT}`)

    // Show users by role
    const byRole = await User.aggregate([
      { $match: { university: 'CHARUSAT' } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    
    console.log('\nUsers by role with CHARUSAT:')
    byRole.forEach(r => {
      console.log(`  ${r._id}: ${r.count}`)
    })

    await mongoose.connection.close()
    console.log('\n✅ Migration complete!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

setUniversityCHARUSAT()
