import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  department: String,
}, { timestamps: true, strict: false })

async function checkRoles() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected\n')

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // Group by role
    const roleGroups = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 }, emails: { $push: '$email' }, departments: { $push: '$department' } } },
      { $sort: { _id: 1 } }
    ])
    
    console.log('Users by role:')
    roleGroups.forEach(group => {
      console.log(`\n${group._id || '(null)'}: ${group.count} users`)
      if (group.count <= 10) {
        group.emails.forEach((email, i) => console.log(`  - ${email} | dept: ${group.departments[i] || '(none)'}`))
      } else {
        console.log(`  - ${group.emails.slice(0, 3).join(', ')}, ...`)
      }
    })

    await mongoose.connection.close()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkRoles()
