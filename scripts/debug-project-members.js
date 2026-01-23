const mongoose = require('mongoose')
require('dotenv').config({ path: '.env.local' })

async function debugProjectMembers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Get raw project data without schema
    const db = mongoose.connection.db
    const collection = db.collection('projectgroups')
    
    // Find the "Ai chatbot" project
    const project = await collection.findOne({ title: "Ai chatbot" })

    if (!project) {
      console.log('❌ Project "Ai chatbot" not found')
      return
    }

    console.log('📋 Raw Project Data:')
    console.log(`  Title: ${project.title}`)
    console.log(`  Group ID: ${project.groupId}`)
    console.log(`  Department: ${project.department}`)
    console.log(`  Leader ID: ${project.leader}`)
    
    console.log(`\n👥 Members (${project.members?.length || 0}):`)
    if (project.members && project.members.length > 0) {
      project.members.forEach((member, index) => {
        console.log(`  ${index + 1}. Role: ${member.role}`)
        console.log(`     Student ID: ${member.student}`)
        console.log('     ---')
      })
    } else {
      console.log('  No members found')
    }

    console.log(`\n📊 Full raw members array:`)
    console.log(JSON.stringify(project.members, null, 2))

    console.log(`\n🔄 Now fetching user details...`)
    const userCollection = db.collection('users')
    
    if (project.members && project.members.length > 0) {
      for (let i = 0; i < project.members.length; i++) {
        const member = project.members[i]
        const user = await userCollection.findOne({ _id: member.student })
        console.log(`\n👤 Member ${i + 1} User Details:`)
        console.log(`  ID: ${user?._id}`)
        console.log(`  Name: ${user?.academicInfo?.name}`)
        console.log(`  Email: ${user?.email}`)
        console.log(`  Role: ${user?.role}`)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
  }
}

debugProjectMembers()