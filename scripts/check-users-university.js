import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

// Define User Schema (minimal for this check)
const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  university: String,
}, { timestamps: true, strict: false })

async function checkUsers() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB\n')

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // Count total users
    const total = await User.countDocuments()
    console.log(`Total users: ${total}`)

    // Count users by university value
    const byUniversity = await User.aggregate([
      { $group: { _id: '$university', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    
    console.log('\nUsers by university field:')
    byUniversity.forEach(u => {
      const label = u._id === null ? '(null/missing)' : u._id === '' ? '(empty string)' : u._id
      console.log(`  ${label}: ${u.count}`)
    })

    // Sample some users
    console.log('\nSample users (first 5):')
    const samples = await User.find().limit(5).select('email role university').lean()
    samples.forEach(s => {
      console.log(`  ${s.email} | ${s.role} | university: "${s.university || '(not set)'}"`)
    })

    await mongoose.connection.close()
    console.log('\n✅ Check complete!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkUsers()
