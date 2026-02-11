import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf'

const userSchema = new mongoose.Schema({}, { timestamps: true, strict: false })

async function fixAll() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB\n')

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // 1. Update ALL users' university to CHARUSAT
    console.log('1️⃣ Updating all universities to CHARUSAT...')
    const result1 = await User.updateMany(
      { university: { $ne: 'CHARUSAT' } },
      { $set: { university: 'CHARUSAT' } }
    )
    console.log(`   ✅ Updated ${result1.modifiedCount} users\n`)

    // 2. Check what roles we have
    console.log('2️⃣ Checking user roles...')
    const roleStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    roleStats.forEach(r => {
      console.log(`   ${r._id || '(null)'}: ${r.count}`)
    })
    console.log()

    // 3. Check if we have guide users
    const guides = await User.find({ role: 'guide' }).select('email academicInfo.name').lean()
    console.log(`3️⃣ Guide users (role='guide'): ${guides.length}`)
    if (guides.length > 0) {
      guides.slice(0, 5).forEach(g => {
        console.log(`   - ${g.email} | ${g.academicInfo?.name}`)
      })
    } else {
      console.log('   ⚠️ No guide users found! Need to create them.')
    }
    console.log()

    // 4. Sample students
    console.log('4️⃣ Checking students...')
    const studentCount = await User.countDocuments({ role: 'student', isActive: true })
    const sampleStudents = await User.find({ role: 'student', isActive: true })
      .select('email role university institute isActive')
      .limit(3)
      .lean()
    
    console.log(`   Total active students: ${studentCount}`)
    sampleStudents.forEach(s => {
      console.log(`   - ${s.email} | uni: ${s.university} | inst: ${s.institute} | active: ${s.isActive}`)
    })

    await mongoose.connection.close()
    console.log('\n✅ Done!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

fixAll()
