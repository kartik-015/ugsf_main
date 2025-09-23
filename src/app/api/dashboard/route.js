import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import Assignment from '@/models/Assignment'
import Subject from '@/models/Subject'
import Submission from '@/models/Submission'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const role = session.user.role
    const userId = session.user.id

    let stats = {}
    let activities = []

    // Get role-specific statistics
    switch (role) {
      case 'admin':
        stats = await getAdminStats()
        activities = await getAdminActivities()
        break
      
      case 'student':
        stats = await getStudentStats(userId)
        activities = await getStudentActivities(userId)
        break
      
      case 'guide':
        stats = await getFacultyStats(userId)
        activities = await getFacultyActivities(userId)
        break
      
  // counselor role removed; no special case
      case 'hod':
        stats = await getHodStats(userId)
        activities = await getHodActivities(userId)
        break
      
      default:
        stats = await getDefaultStats()
        activities = await getDefaultActivities()
    }

    return NextResponse.json({
      stats,
      activities
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getAdminStats() {
  const [
    totalStudents,
    totalCounselors,
    activeSubjects,
    pendingAssignments
  ] = await Promise.all([
  User.countDocuments({ role: 'student' }),
  // count academic staff (faculty + hod)
  User.countDocuments({ role: { $in: ['guide','hod'] } }),
    Subject.countDocuments({ isActive: true }),
    Assignment.countDocuments({ dueDate: { $gte: new Date() } })
  ])

  return {
    totalStudents,
    totalCounselors,
    activeSubjects,
    pendingAssignments,
    averageGrade: 85 // Placeholder
  }
}

async function getHodStats(userId) {
  const user = await User.findById(userId)
  const department = user.department
  const [
    students,
  faculty,
    projectsPending
  ] = await Promise.all([
    User.countDocuments({ role: 'student', department }),
  User.countDocuments({ role: 'guide', department, isApproved: true }),
    (await import('@/models/ProjectGroup')).default.countDocuments({ department, status: { $in: ['submitted', 'under-review'] }})
  ])
  return { department, students, faculty, projectsPending }
}

async function getStudentStats(userId) {
  const user = await User.findById(userId)
  
  const [
    enrolledSubjects,
    assignmentsDue,
    completedAssignments,
    currentGPA
  ] = await Promise.all([
    Subject.countDocuments({ students: userId }),
    Assignment.countDocuments({
      dueDate: { $gte: new Date() },
      subject: { $in: await Subject.find({ students: userId }).distinct('_id') }
    }),
    Submission.countDocuments({ student: userId, status: 'submitted' }),
    calculateStudentGPA(userId)
  ])

  return {
    enrolledSubjects,
    assignmentsDue,
    completedAssignments,
    currentGPA: currentGPA.toFixed(2)
  }
}

async function getFacultyStats(userId) {
  const [
    teachingSubjects,
    activeAssignments,
    pendingGrades,
    totalStudents
  ] = await Promise.all([
    Subject.countDocuments({ faculty: userId }),
    Assignment.countDocuments({ faculty: userId, dueDate: { $gte: new Date() } }),
    Submission.countDocuments({ 
      assignment: { $in: await Assignment.find({ faculty: userId }).distinct('_id') },
      status: 'submitted',
      grade: { $exists: false }
    }),
    User.countDocuments({ role: 'student' })
  ])

  return {
    teachingSubjects,
    activeAssignments,
    pendingGrades,
    totalStudents
  }
}

async function getDefaultStats() {
  return {
    totalStudents: 0,
    activeSubjects: 0,
    pendingAssignments: 0,
    averageGrade: 0
  }
}

async function getAdminActivities() {
  const recentStudents = await User.find({ role: 'student' })
    .sort({ createdAt: -1 })
    .limit(3)
    .select('email academicInfo.name createdAt')

  return recentStudents.map(student => ({
    title: 'New Student Registration',
    time: formatTimeAgo(student.createdAt),
    description: student.academicInfo?.name || student.email
  }))
}

async function getStudentActivities(userId) {
  const recentSubmissions = await Submission.find({ student: userId })
    .populate('assignment')
    .sort({ createdAt: -1 })
    .limit(5)

  return recentSubmissions.map(submission => ({
    title: 'Assignment Submitted',
    time: formatTimeAgo(submission.createdAt),
    description: submission.assignment?.title || 'Assignment'
  }))
}

async function getFacultyActivities(userId) {
  const recentAssignments = await Assignment.find({ faculty: userId })
    .sort({ createdAt: -1 })
    .limit(5)

  return recentAssignments.map(assignment => ({
    title: 'Assignment Created',
    time: formatTimeAgo(assignment.createdAt),
    description: assignment.title
  }))
}

async function getDefaultActivities() {
  return []
}

async function calculateStudentGPA(userId) {
  const submissions = await Submission.find({ 
    student: userId,
    grade: { $exists: true }
  }).populate('assignment')

  if (submissions.length === 0) return 0

  const totalPoints = submissions.reduce((sum, submission) => {
    const percentage = (submission.grade / submission.assignment.maxMarks) * 100
    const points = percentage >= 90 ? 4.0 :
                   percentage >= 80 ? 3.0 :
                   percentage >= 70 ? 2.0 :
                   percentage >= 60 ? 1.0 : 0.0
    return sum + points
  }, 0)

  return totalPoints / submissions.length
}

function formatTimeAgo(date) {
  const now = new Date()
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  return `${Math.floor(diffInSeconds / 86400)} days ago`
}


