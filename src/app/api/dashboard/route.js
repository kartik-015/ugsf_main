import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import ProjectGroup from '@/models/ProjectGroup'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const role = session.user.role
    const userId = session.user.id
    const department = session.user.department

    let stats = {}
    let activities = []

    switch (role) {
      case 'admin':
      case 'mainadmin':
      case 'principal':
      case 'hod':
      case 'project_coordinator':
        // Stakeholder roles get redirected to admin dashboard;
        // but if called directly, return minimal stats
        stats = await getStakeholderStats(role, department)
        activities = await getRecentActivities(role, department)
        break
      
      case 'student':
        stats = await getStudentStats(userId)
        activities = await getStudentActivities(userId)
        break
      
      case 'guide':
        stats = await getGuideStats(userId)
        activities = await getGuideActivities(userId)
        break
      
      default:
        stats = {}
        activities = []
    }

    return NextResponse.json({ stats, activities })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getStakeholderStats(role, department) {
  const isDeptScoped = (role === 'hod' || role === 'project_coordinator') && department
  const filter = isDeptScoped ? { department } : {}

  const [totalStudents, totalGuides, totalProjects, projectsPending] = await Promise.all([
    User.countDocuments({ role: 'student', ...filter }),
    User.countDocuments({ role: 'guide', ...filter }),
    ProjectGroup.countDocuments(filter),
    ProjectGroup.countDocuments({ status: { $in: ['submitted', 'under-review'] }, ...filter })
  ])

  return { totalStudents, totalGuides, totalProjects, projectsPending, department: isDeptScoped ? department : 'All' }
}

async function getStudentStats(userId) {
  // Find student's project groups with populated data
  const myProjects = await ProjectGroup.find({ 'members.student': userId })
    .populate('leader', 'academicInfo.name email')
    .populate('members.student', 'academicInfo.name email academicInfo.rollNumber')
    .populate('internalGuide', 'academicInfo.name email')
    .populate('externalGuide', 'name email')
  
  const activeProject = myProjects.find(p => !['rejected', 'completed'].includes(p.status))
  
  // Reports breakdown
  const reports = activeProject?.monthlyReports || []
  const gradedReports = reports.filter(r => r.status === 'graded' && r.score != null)
  const submittedReports = reports.filter(r => r.status === 'submitted')
  const totalReports = reports.length

  // Progress from graded reports
  const avgScore = gradedReports.length > 0
    ? Math.round((gradedReports.reduce((s, r) => s + r.score, 0) / gradedReports.length) * 10) / 10
    : 0
  const progressPercent = Math.round(avgScore * 10) // score is 0-10, convert to 0-100

  // Upcoming deadlines
  const deadlines = (activeProject?.deadlines || [])
    .filter(d => !d.isCompleted && new Date(d.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))

  // Report scores for chart
  const reportScores = gradedReports.map(r => ({
    month: r.month,
    year: r.year,
    title: r.title || `Report ${r.month}/${r.year}`,
    score: r.score,
    grade: r.grade || '-',
  }))

  // Team members
  const teamMembers = (activeProject?.members || []).map(m => ({
    name: m.student?.academicInfo?.name || 'Unknown',
    rollNumber: m.student?.academicInfo?.rollNumber || '',
    email: m.student?.email || '',
    role: m.role,
  }))

  // Guide info
  const guideInfo = activeProject?.internalGuide ? {
    name: activeProject.internalGuide.academicInfo?.name || '',
    email: activeProject.internalGuide.email || '',
  } : null

  return {
    // Project basics
    projectTitle: activeProject?.title || null,
    projectStatus: activeProject?.status || null,
    groupId: activeProject?.groupId || null,
    domain: activeProject?.domain || null,
    technology: activeProject?.technology || null,
    department: activeProject?.department || null,
    semester: activeProject?.semester || null,
    hodApproval: activeProject?.hodApproval || null,
    guideStatus: activeProject?.guideStatus || null,
    
    // Guide
    guide: guideInfo,
    
    // Team
    teamMembers,
    teamSize: teamMembers.length,
    
    // Reports & Progress
    totalReports,
    gradedCount: gradedReports.length,
    submittedCount: submittedReports.length,
    avgScore,
    progressPercent,
    reportScores,
    
    // Deadlines
    upcomingDeadlines: deadlines.slice(0, 3).map(d => ({
      title: d.title,
      dueDate: d.dueDate,
    })),
    deadlineCount: deadlines.length,
    
    // Total projects
    totalProjects: myProjects.length,
    hasProject: !!activeProject,
  }
}

async function getGuideStats(userId) {
  const guidedProjects = await ProjectGroup.find({ internalGuide: userId })
    .populate('members.student', 'academicInfo.name academicInfo.rollNumber email')
  const totalStudents = guidedProjects.reduce((sum, p) => sum + (p.members?.length || 0), 0)
  const pendingReview = guidedProjects.filter(p => p.status === 'submitted' || p.guideStatus === 'pending').length
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const pendingSubmission = guidedProjects.filter(p => {
    // Count projects that are active for reporting but have no turned-in report this month.
    if (p.hodApproval !== 'approved' || p.guideStatus !== 'accepted') return false
    const hasSubmittedThisMonth = (p.monthlyReports || []).some(r => {
      const sameMonth = r?.month === currentMonth && r?.year === currentYear
      const isTurnedIn = r?.turnedIn || r?.status === 'submitted' || r?.status === 'graded'
      return sameMonth && isTurnedIn
    })
    return !hasSubmittedThisMonth
  }).length
  const reportsToGrade = guidedProjects.reduce((sum, p) => {
    return sum + (p.monthlyReports?.filter(r => r.status === 'submitted')?.length || 0)
  }, 0)

  // Domain-wise breakdown
  const domainMap = {}
  guidedProjects.forEach(p => {
    const d = p.domain || 'Uncategorized'
    domainMap[d] = (domainMap[d] || 0) + 1
  })
  const domainBreakdown = Object.entries(domainMap).map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Semester-wise breakdown
  const semesterMap = {}
  guidedProjects.forEach(p => {
    const s = p.semester ? `Sem ${p.semester}` : 'Unknown'
    semesterMap[s] = (semesterMap[s] || 0) + 1
  })
  const semesterBreakdown = Object.entries(semesterMap).map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      const sA = parseInt(a.name.replace('Sem ', '')) || 0
      const sB = parseInt(b.name.replace('Sem ', '')) || 0
      return sA - sB
    })

  // Status-wise breakdown
  const statusMap = {}
  guidedProjects.forEach(p => {
    const st = p.status || 'unknown'
    statusMap[st] = (statusMap[st] || 0) + 1
  })
  const statusBreakdown = Object.entries(statusMap).map(([name, count]) => ({ name, count }))

  // Average progress across projects
  const avgProgress = guidedProjects.length > 0
    ? Math.round(guidedProjects.reduce((s, p) => s + (p.progressScore || 0), 0) / guidedProjects.length)
    : 0

  // Total graded & pending reports
  const totalReports = guidedProjects.reduce((s, p) => s + (p.monthlyReports?.length || 0), 0)
  const gradedReports = guidedProjects.reduce((s, p) => {
    return s + (p.monthlyReports?.filter(r => r.status === 'graded')?.length || 0)
  }, 0)

  // Project list summary for table
  const projectSummaries = guidedProjects.map(p => ({
    groupId: p.groupId,
    title: p.title,
    domain: p.domain || '-',
    semester: p.semester,
    status: p.status,
    members: p.members?.length || 0,
    progress: p.progressScore || 0,
    reports: p.monthlyReports?.length || 0,
    gradedReports: p.monthlyReports?.filter(r => r.status === 'graded')?.length || 0,
  }))

  return {
    totalProjects: guidedProjects.length,
    totalStudents,
    pendingReview,
    pendingSubmission,
    reportsToGrade,
    acceptedProjects: guidedProjects.filter(p => p.guideStatus === 'accepted').length,
    domainBreakdown,
    semesterBreakdown,
    statusBreakdown,
    avgProgress,
    totalReports,
    gradedReports,
    projectSummaries,
  }
}

async function getRecentActivities(role, department) {
  const isDeptScoped = (role === 'hod' || role === 'project_coordinator') && department
  const filter = isDeptScoped ? { department } : {}

  const recentProjects = await ProjectGroup.find(filter)
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('title status updatedAt department groupId')

  return recentProjects.map(p => ({
    title: `Project ${p.status}`,
    time: formatTimeAgo(p.updatedAt),
    description: `${p.title} (${p.groupId})`
  }))
}

async function getStudentActivities(userId) {
  const myProjects = await ProjectGroup.find({ 'members.student': userId })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('title status updatedAt groupId')

  return myProjects.map(p => ({
    title: `Project: ${p.title}`,
    time: formatTimeAgo(p.updatedAt),
    description: `Status: ${p.status}`
  }))
}

async function getGuideActivities(userId) {
  const guidedProjects = await ProjectGroup.find({ internalGuide: userId })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('title status updatedAt groupId')

  return guidedProjects.map(p => ({
    title: `Project: ${p.title}`,
    time: formatTimeAgo(p.updatedAt),
    description: `Status: ${p.status}`
  }))
}

function formatTimeAgo(date) {
  const now = new Date()
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  return `${Math.floor(diffInSeconds / 86400)} days ago`
}


