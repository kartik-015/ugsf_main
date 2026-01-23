const { MongoClient } = require('mongodb')
const bcrypt = require('bcryptjs')

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-portal'

async function verifyAdminUsers() {
  let client
  
  try {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db()
    const users = db.collection('users')
    
    // Test credentials
    const testPassword = 'charusat@123'
    
    // List of admin users to verify
    const adminEmails = [
      'principal@depstar.ac.in',
      'principal@cspit.ac.in',
      'hodcs@charusat.ac.in',
      'hodce@charusat.ac.in',
      'hodit@charusat.ac.in',
      'hoddcs@charusat.ac.in',
      'hoddce@charusat.ac.in',
      'hoddit@charusat.ac.in'
    ]
    
    console.log('🔍 Verifying admin users...\n')
    
    for (const email of adminEmails) {
      const user = await users.findOne({ email })
      
      if (!user) {
        console.log(`❌ ${email} - NOT FOUND`)
        continue
      }
      
      // Verify password
      const passwordMatch = await bcrypt.compare(testPassword, user.password)
      
      console.log(`✅ ${email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Institute: ${user.institute}`)
      console.log(`   Department: ${user.department || 'All'}`)
      console.log(`   Name: ${user.academicInfo?.name || 'Not set'}`)
      console.log(`   Password: ${passwordMatch ? '✅ Correct' : '❌ Incorrect'}`)
      console.log(`   Verified: ${user.isVerified ? '✅ Yes' : '❌ No'}`)
      console.log('')
    }
    
    // Summary
    const totalCount = await users.countDocuments({ 
      email: { $in: adminEmails }
    })
    
    const hodCount = await users.countDocuments({ 
      role: 'hod',
      email: { $in: adminEmails }
    })
    
    const principalCount = await users.countDocuments({ 
      role: 'principal',
      email: { $in: adminEmails }
    })
    
    console.log('📊 Summary:')
    console.log(`Total Admin Users: ${totalCount}/8`)
    console.log(`Principals: ${principalCount}/2`)
    console.log(`HODs: ${hodCount}/6`)
    console.log(`Password for all: ${testPassword}`)
    
    // Test department filtering
    console.log('\n🏢 Department Structure:')
    const depts = ['CSE', 'CE', 'IT']
    const institutes = ['CSPIT', 'DEPSTAR']
    
    for (const institute of institutes) {
      console.log(`\n${institute}:`)
      for (const dept of depts) {
        const hod = await users.findOne({ 
          role: 'hod', 
          department: dept, 
          institute: institute 
        })
        console.log(`  ${dept} HOD: ${hod ? hod.email : 'NOT FOUND'}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error verifying users:', error)
  } finally {
    if (client) {
      await client.close()
      console.log('\n🔌 Database connection closed')
    }
  }
}

// Run verification
verifyAdminUsers()