const bcrypt = require('bcryptjs')
const { MongoClient } = require('mongodb')

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-portal'

async function addAdminUsers() {
  let client
  
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db()
    const users = db.collection('users')
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('charusat@123', 12)
    console.log('🔐 Password hashed')
    
    // Define users to add
    const adminUsers = [
      // Principals
      {
        email: 'principal@depstar.ac.in',
        password: hashedPassword,
        role: 'principal',
        department: null, // Principals oversee all departments
        university: 'CHARUSAT',
        institute: 'DEPSTAR',
        isVerified: true,
        academicInfo: {
          name: 'Principal DEPSTAR',
          phoneNumber: null,
          address: null,
          semester: null,
          rollNumber: null,
          admissionYear: null,
          section: null
        },
        specialization: 'Administration',
        education: 'Principal',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'principal@cspit.ac.in',
        password: hashedPassword,
        role: 'principal',
        department: null, // Principals oversee all departments
        university: 'CHARUSAT',
        institute: 'CSPIT',
        isVerified: true,
        academicInfo: {
          name: 'Principal CSPIT',
          phoneNumber: null,
          address: null,
          semester: null,
          rollNumber: null,
          admissionYear: null,
          section: null
        },
        specialization: 'Administration',
        education: 'Principal',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // CSPIT HODs
      {
        email: 'hodcs@charusat.ac.in',
        password: hashedPassword,
        role: 'hod',
        department: 'CSE',
        university: 'CHARUSAT',
        institute: 'CSPIT',
        isVerified: true,
        academicInfo: {
          name: 'HOD Computer Science Engineering',
          phoneNumber: null,
          address: null,
          semester: null,
          rollNumber: null,
          admissionYear: null,
          section: null
        },
        specialization: 'Computer Science',
        education: 'PhD Computer Science',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'hodce@charusat.ac.in',
        password: hashedPassword,
        role: 'hod',
        department: 'CE',
        university: 'CHARUSAT',
        institute: 'CSPIT',
        isVerified: true,
        academicInfo: {
          name: 'HOD Computer Engineering',
          phoneNumber: null,
          address: null,
          semester: null,
          rollNumber: null,
          admissionYear: null,
          section: null
        },
        specialization: 'Computer Engineering',
        education: 'PhD Computer Engineering',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'hodit@charusat.ac.in',
        password: hashedPassword,
        role: 'hod',
        department: 'IT',
        university: 'CHARUSAT',
        institute: 'CSPIT',
        isVerified: true,
        academicInfo: {
          name: 'HOD Information Technology',
          phoneNumber: null,
          address: null,
          semester: null,
          rollNumber: null,
          admissionYear: null,
          section: null
        },
        specialization: 'Information Technology',
        education: 'PhD Information Technology',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // DEPSTAR HODs
      {
        email: 'hoddcs@charusat.ac.in',
        password: hashedPassword,
        role: 'hod',
        department: 'CSE',
        university: 'CHARUSAT',
        institute: 'DEPSTAR',
        isVerified: true,
        academicInfo: {
          name: 'HOD Computer Science Engineering - DEPSTAR',
          phoneNumber: null,
          address: null,
          semester: null,
          rollNumber: null,
          admissionYear: null,
          section: null
        },
        specialization: 'Computer Science',
        education: 'PhD Computer Science',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'hoddce@charusat.ac.in',
        password: hashedPassword,
        role: 'hod',
        department: 'CE',
        university: 'CHARUSAT',
        institute: 'DEPSTAR',
        isVerified: true,
        academicInfo: {
          name: 'HOD Computer Engineering - DEPSTAR',
          phoneNumber: null,
          address: null,
          semester: null,
          rollNumber: null,
          admissionYear: null,
          section: null
        },
        specialization: 'Computer Engineering',
        education: 'PhD Computer Engineering',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'hoddit@charusat.ac.in',
        password: hashedPassword,
        role: 'hod',
        department: 'IT',
        university: 'CHARUSAT',
        institute: 'DEPSTAR',
        isVerified: true,
        academicInfo: {
          name: 'HOD Information Technology - DEPSTAR',
          phoneNumber: null,
          address: null,
          semester: null,
          rollNumber: null,
          admissionYear: null,
          section: null
        },
        specialization: 'Information Technology',
        education: 'PhD Information Technology',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    
    // Check for existing users and add new ones
    let addedCount = 0
    let skippedCount = 0
    
    for (const user of adminUsers) {
      const existing = await users.findOne({ email: user.email })
      
      if (existing) {
        console.log(`⚠️  User ${user.email} already exists - skipping`)
        skippedCount++
      } else {
        await users.insertOne(user)
        console.log(`✅ Added ${user.role} user: ${user.email} (${user.institute}${user.department ? ` - ${user.department}` : ''})`)
        addedCount++
      }
    }
    
    console.log('\n📊 Summary:')
    console.log(`✅ Added: ${addedCount} users`)
    console.log(`⚠️  Skipped (already exists): ${skippedCount} users`)
    console.log(`🔐 All users have password: charusat@123`)
    
    // Display the added users structure
    console.log('\n👥 User Structure:')
    console.log('PRINCIPALS:')
    console.log('  - principal@depstar.ac.in (DEPSTAR)')
    console.log('  - principal@cspit.ac.in (CSPIT)')
    console.log('\nCSPIT HODs:')
    console.log('  - hodcs@charusat.ac.in (CSE)')
    console.log('  - hodce@charusat.ac.in (CE)')
    console.log('  - hodit@charusat.ac.in (IT)')
    console.log('\nDEPSTAR HODs:')
    console.log('  - hoddcs@charusat.ac.in (CSE)')
    console.log('  - hoddce@charusat.ac.in (CE)')
    console.log('  - hoddit@charusat.ac.in (IT)')
    
  } catch (error) {
    console.error('❌ Error adding admin users:', error)
  } finally {
    if (client) {
      await client.close()
      console.log('\n🔌 Database connection closed')
    }
  }
}

// Run the script
addAdminUsers()