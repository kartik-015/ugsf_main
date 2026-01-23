const { MongoClient } = require('mongodb')

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-portal'

async function fixEmailVerification() {
  let client
  
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db()
    const users = db.collection('users')
    
    // List of admin users to fix
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
    
    console.log('🔧 Fixing email verification for admin users...\n')
    
    for (const email of adminEmails) {
      const result = await users.updateOne(
        { email: email },
        { 
          $set: { 
            isEmailVerified: true,
            isVerified: true, // Keep both for consistency
            // Also ensure they don't need onboarding
            isOnboarded: true,
            // Clear any verification tokens
            emailVerificationOTP: null,
            emailVerificationExpires: null
          }
        }
      )
      
      if (result.matchedCount > 0) {
        console.log(`✅ Fixed: ${email}`)
      } else {
        console.log(`❌ Not found: ${email}`)
      }
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying email verification status...\n')
    
    for (const email of adminEmails) {
      const user = await users.findOne({ email })
      if (user) {
        console.log(`${email}:`)
        console.log(`   isEmailVerified: ${user.isEmailVerified ? '✅' : '❌'}`)
        console.log(`   isVerified: ${user.isVerified ? '✅' : '❌'}`)
        console.log(`   isOnboarded: ${user.isOnboarded ? '✅' : '❌'}`)
      }
    }
    
    console.log('\n✅ Email verification fix complete!')
    console.log('🔐 All admin users can now log in with: charusat@123')
    
  } catch (error) {
    console.error('❌ Error fixing email verification:', error)
  } finally {
    if (client) {
      await client.close()
      console.log('\n🔌 Database connection closed')
    }
  }
}

// Run the fix
fixEmailVerification()