const { MongoClient, ObjectId } = require('mongodb')

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-portal'

// The project ID to keep (from your screenshot)
const PROJECT_TO_KEEP = '68d4e65146a728f88faba2ba'

async function cleanupProjects() {
  let client
  
  try {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db()
    const projects = db.collection('projectgroups') // Note: collection name might be 'projectgroups'
    
    // First, let's see all projects
    const allProjects = await projects.find({}).toArray()
    console.log(`📊 Total projects found: ${allProjects.length}`)
    
    if (allProjects.length > 0) {
      console.log('\n📋 Current projects:')
      allProjects.forEach((p, index) => {
        console.log(`${index + 1}. ${p.title} (${p.department}) - ${p.status} - ${p.hodApproval || 'pending'}`)
        console.log(`   ID: ${p._id}`)
      })
    }
    
    // Find the project to keep
    const projectToKeep = await projects.findOne({ _id: new ObjectId(PROJECT_TO_KEEP) })
    
    if (!projectToKeep) {
      console.log(`❌ Project with ID ${PROJECT_TO_KEEP} not found!`)
      console.log('Available project IDs:')
      allProjects.forEach(p => console.log(`   - ${p._id}`))
      return
    }
    
    console.log(`\n🎯 Project to keep:`)
    console.log(`   Title: ${projectToKeep.title}`)
    console.log(`   Department: ${projectToKeep.department}`)
    console.log(`   Status: ${projectToKeep.status}`)
    console.log(`   HOD Approval: ${projectToKeep.hodApproval || 'pending'}`)
    console.log(`   Group ID: ${projectToKeep.groupId}`)
    
    // Delete all other projects
    const deleteResult = await projects.deleteMany({ 
      _id: { $ne: new ObjectId(PROJECT_TO_KEEP) }
    })
    
    console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} other projects`)
    
    // Verify the remaining project
    const remainingProjects = await projects.find({}).toArray()
    console.log(`\n✅ Remaining projects: ${remainingProjects.length}`)
    
    if (remainingProjects.length === 1) {
      const project = remainingProjects[0]
      console.log('\n📋 Final project:')
      console.log(`   Title: ${project.title}`)
      console.log(`   Department: ${project.department}`)
      console.log(`   Status: ${project.status}`)
      console.log(`   HOD Approval: ${project.hodApproval || 'pending'}`)
      console.log(`   Leader: ${project.leader}`)
      console.log(`   Members: ${project.members?.length || 0}`)
      
      // Check which HODs should see this project
      console.log(`\n👔 HODs who should see this project:`)
      console.log(`   CSPIT IT HOD: hodit@charusat.ac.in`)
      console.log(`   DEPSTAR IT HOD: hoddit@charusat.ac.in`)
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up projects:', error)
  } finally {
    if (client) {
      await client.close()
      console.log('\n🔌 Database connection closed')
    }
  }
}

// Run cleanup
cleanupProjects()