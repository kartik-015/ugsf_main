const { MongoClient } = require('mongodb')

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-portal'

async function testHODAccess() {
  let client
  
  try {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db()
    const users = db.collection('users')
    const projects = db.collection('projectgroups')
    
    // Test the project query
    const project = await projects.findOne({})
    console.log('📋 Project in database:')
    console.log(`   Title: ${project?.title}`)
    console.log(`   Department: ${project?.department}`)
    console.log(`   Status: ${project?.status}`)
    console.log(`   HOD Approval: ${project?.hodApproval || 'pending'}`)
    
    // Test HOD users
    console.log('\n👔 Testing HOD users:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const itHods = await users.find({ 
      role: 'hod', 
      department: 'IT' 
    }).toArray()
    
    console.log(`\nIT HODs found: ${itHods.length}`)
    itHods.forEach(hod => {
      console.log(`   📧 ${hod.email}`)
      console.log(`   🏢 Institute: ${hod.institute}`)
      console.log(`   📚 Department: ${hod.department}`)
    })
    
    // Test the actual filter that would be used
    console.log('\n🔍 Testing project filters:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    for (const hod of itHods) {
      const hodFilter = { department: hod.department }
      const projectsForHod = await projects.find(hodFilter).toArray()
      
      console.log(`\n${hod.email} (${hod.institute}):`)
      console.log(`   Filter: ${JSON.stringify(hodFilter)}`)
      console.log(`   Projects found: ${projectsForHod.length}`)
      
      if (projectsForHod.length > 0) {
        projectsForHod.forEach(p => {
          console.log(`   ✅ ${p.title} (${p.department}) - ${p.status}`)
        })
      } else {
        console.log(`   ❌ No projects found`)
      }
    }
    
    // Check if there might be a case sensitivity issue
    console.log('\n🔤 Case sensitivity check:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const testFilters = [
      { department: 'IT' },
      { department: 'it' },
      { department: 'It' },
      { department: 'iT' }
    ]
    
    for (const filter of testFilters) {
      const count = await projects.countDocuments(filter)
      console.log(`   ${JSON.stringify(filter)}: ${count} projects`)
    }
    
  } catch (error) {
    console.error('❌ Error testing HOD access:', error)
  } finally {
    if (client) {
      await client.close()
      console.log('\n🔌 Database connection closed')
    }
  }
}

// Run test
testHODAccess()