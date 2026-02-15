import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import ProjectGroup from '@/models/ProjectGroup'

// Helper to get current ISO week range (Mon-Sun)
function currentWeekRange() {
  const now = new Date()
  const day = now.getDay() || 7 // Sunday=0 -> 7
  const weekEnd = new Date(now)
  weekEnd.setHours(23,59,59,999)
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - (day - 1))
  weekStart.setHours(0,0,0,0)
  return { weekStart, weekEnd }
}

// POST: submit weekly report (leader only)
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await dbConnect()

    const { groupId } = params
    const body = await request.json()
    const { summary, accomplishments, blockers, planNextWeek } = body
    if (!summary) return NextResponse.json({ error: 'Summary required' }, { status: 400 })

    const project = await ProjectGroup.findOne({ groupId })
    if (!project) return NextResponse.json({ error: 'Project group not found' }, { status: 404 })

    if (String(project.leader) !== session.user.id) {
      return NextResponse.json({ error: 'Only leader can submit report' }, { status: 403 })
    }

    const { weekStart, weekEnd } = currentWeekRange()

    // Prevent duplicate weekly submission
    const existing = project.weeklyReports.find(r => r.weekStart.getTime() === weekStart.getTime())
    if (existing) {
      return NextResponse.json({ error: 'Week report already submitted' }, { status: 409 })
    }

    project.weeklyReports.push({
      weekStart, weekEnd, summary, accomplishments, blockers, planNextWeek, submittedBy: session.user.id
    })
    await project.save()

    return NextResponse.json({ success: true, weeklyReports: project.weeklyReports })
  } catch (e) {
    console.error('Weekly report submit error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: list weekly reports (leader/members, internalGuide, admin, hod)
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await dbConnect()

    const { groupId } = params
    const project = await ProjectGroup.findOne({ groupId })
      .populate('weeklyReports.submittedBy', 'academicInfo.name email')
      .populate('weeklyReports.reviewedBy', 'academicInfo.name email')

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const uid = session.user.id
    const role = session.user.role
    const memberIds = project.members.map(m => String(m.student))

  if (!memberIds.includes(uid) && !['admin','hod','guide'].includes(role) && String(project.internalGuide) !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

  // Guide/internalGuide can only view if they are assigned
  if (role === 'guide' && project.internalGuide && String(project.internalGuide) !== uid && !memberIds.includes(uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ weeklyReports: project.weeklyReports })
  } catch (e) {
    console.error('Weekly report list error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: guide provide feedback
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await dbConnect()

    const role = session.user.role
  if (!['guide','admin','hod'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { groupId } = params
    const body = await request.json()
    const { reportId, feedback } = body
    if (!reportId || !feedback) return NextResponse.json({ error: 'reportId & feedback required' }, { status: 400 })

    const project = await ProjectGroup.findOne({ groupId })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (role === 'guide' && String(project.internalGuide) !== session.user.id) {
      return NextResponse.json({ error: 'Not assigned guide' }, { status: 403 })
    }

    const report = project.weeklyReports.id(reportId)
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    report.feedback = feedback
    report.reviewedBy = session.user.id
    report.reviewedAt = new Date()
    await project.save()

    return NextResponse.json({ success: true, report })
  } catch (e) {
    console.error('Weekly report feedback error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
