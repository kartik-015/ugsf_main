/**
 * Delete All Students Script
 * 
 * Completely DELETES all student user documents from the database,
 * along with all related data (project groups, report files, notifications).
 * 
 * After running this, students must register fresh as brand-new users.
 * 
 * Usage: node --loader ./scripts/loader.mjs scripts/cleanStudentData.js
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local')
  process.exit(1)
}

async function deleteAllStudents() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    const db = mongoose.connection.db
    const usersCollection = db.collection('users')
    const projectsCollection = db.collection('projectgroups')
    const reportsCollection = db.collection('reportfiles')
    const notificationsCollection = db.collection('notifications')

    // 1. Find all student IDs first (needed for cleaning related data)
    const students = await usersCollection.find({ role: 'student' }).project({ _id: 1, email: 1 }).toArray()
    const studentIds = students.map(s => s._id)
    console.log(`Found ${students.length} student records to delete`)

    if (students.length === 0) {
      console.log('No students found. Exiting.')
      process.exit(0)
    }

    // 2. Delete all project groups (they reference students)
    const deletedProjects = await projectsCollection.deleteMany({})
    console.log(`Deleted ${deletedProjects.deletedCount} project groups`)

    // 3. Delete all report files
    const deletedReports = await reportsCollection.deleteMany({})
    console.log(`Deleted ${deletedReports.deletedCount} report files`)

    // 4. Delete notifications sent to/about students
    const deletedNotifications = await notificationsCollection.deleteMany({
      $or: [
        { recipient: { $in: studentIds } },
        { sender: { $in: studentIds } },
      ]
    })
    console.log(`Deleted ${deletedNotifications.deletedCount} student notifications`)

    // 5. Fully DELETE all student user documents
    const deletedStudents = await usersCollection.deleteMany({ role: 'student' })
    console.log(`Deleted ${deletedStudents.deletedCount} student records`)

    console.log('\n✅ All students fully deleted from database.')
    console.log('Students can now register as brand-new users at /register?role=student')
    console.log('Default password: depstar@123')

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

deleteAllStudents()
