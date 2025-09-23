  // Only allow registration if user is admin, guide, or student
  // (Assume registration logic is in /api/auth/register or similar)
  // For project creation, ensure all members and leader are included
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import dbConnect from '@/lib/mongodb'
import { enforceWordLimit, parseMultiValue, validateSemicolonList } from '@/lib/validation'
import ProjectGroup from '@/models/ProjectGroup'
import User from '@/models/User'
import { canWrite } from '@/lib/permissions'

// Simple in-memory notifications (replace with persistent store later)
if (!global.projectNotifications) {
  global.projectNotifications = []
}

// Create a project group (student leader submits on behalf of the team)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })

    if(!canWrite(session.user.role)) return NextResponse.json({ ok:false, error:{ code:'FORBIDDEN', message:'Principal role is read-only' } }, { status:403 })

    await dbConnect()

    const body = await request.json()

  let { title, description, domain, department, semester, members = [], memberEmails = [], memberEmailsString, memberIdsString } = body
    if (department) department = department.toUpperCase();

    if (!title || !department || !semester) {
  return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields' } }, { status: 400 })
    }

    if(memberEmailsString){
      const v = validateSemicolonList(memberEmailsString)
      if(!v.ok) return NextResponse.json({ ok:false, error:{ code:'BAD_REQUEST', message:v.error } }, { status:400 })
      memberEmails = [...memberEmails, ...v.values]
    }
    if(memberIdsString){
      const v = validateSemicolonList(memberIdsString)
      if(!v.ok) return NextResponse.json({ ok:false, error:{ code:'BAD_REQUEST', message:v.error } }, { status:400 })
      members = [...members, ...v.values]
    }
    const descCheck = enforceWordLimit(description, 200)
    if(!descCheck.ok){
      return NextResponse.json({ ok:false, error:{ code: 'BAD_REQUEST', message: descCheck.error } }, { status:400 })
    }

    // Build members from ids or emails (optional at creation)
    const memberIds = [...new Set([
      ...members.map(m => String(m.student || m)),
      ...(await (async () => {
        if (!memberEmails || memberEmails.length === 0) return []
  const users = await User.find({ email: { $in: memberEmails.map(e => e.toLowerCase()) }, role: 'student' }).select('_id department email')
  const found = users.map(u=>u.email.toLowerCase())
  const missing = memberEmails.filter(e=>!found.includes(e.toLowerCase()))
  if(missing.length) throw new Error(`Member emails not found: ${missing.join(', ')}`)
  return users.map(u => String(u._id))
      })())
    ])]

  // Validate all member ids (allow cross-department)
  const memberUsers = await User.find({ _id: { $in: memberIds }, role: 'student' })
    if (memberUsers.length !== memberIds.length) {
  return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid members list' } }, { status: 400 })
    }
  // Removed department uniformity requirement (cross-department collaboration allowed)

    const leaderId = session.user.id
    const isLeaderIncluded = memberIds.some(id => String(id) === String(leaderId))
  // Ensure all members and leader are included, and avoid duplicates
  const allMemberIds = [...new Set([...memberIds, leaderId])]
  const finalMembers = allMemberIds.map(id => ({ student: id, role: String(id) === String(leaderId) ? 'leader' : 'member' }))

    const project = new ProjectGroup({
      title,
      description,
      domain,
      department,
      semester,
      members: finalMembers,
      leader: leaderId,
      status: 'submitted',
      groupId: `GRP${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`
    })

    await project.save()

    return NextResponse.json({ ok: true, data: project }, { status: 201 })
  } catch (error) {
    console.error('Project creation error:', error)
    return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: error.message || 'Internal server error' } }, { status: 500 })
  }
}

// List project groups for role
export async function GET(request) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized', projects: [] }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const qDept = searchParams.get('department')
    const qYear = searchParams.get('year')
    const role = session.user.role
    let filter = {}

    if (role === 'student') {
      filter = { 'members.student': session.user.id }
  } else if (role === 'guide') {
      filter = { internalGuide: session.user.id }
    } else if (role === 'hod') {
      const hodDept = session.user.department ? session.user.department.toUpperCase() : '';
      filter = { department: hodDept }
      if (qDept) filter.department = qDept.toUpperCase()
    } else if (role === 'admin') {
      if (qDept) filter.department = qDept.toUpperCase()
    }

    if (qYear && (role === 'admin' || role === 'hod')) {
      const yearUsers = await User.find({ admissionYear: Number(qYear) }).select('_id')
      const yearIds = yearUsers.map(u => u._id)
      filter.$and = [ { ...(filter.department ? { department: filter.department } : {}) }, { 'members.student': { $in: yearIds } } ]
      delete filter.department
    }

    const projects = await ProjectGroup.find(filter)
      .populate('leader', 'academicInfo.name email department admissionYear university institute')
      .populate('members.student', 'academicInfo.name email department admissionYear university institute')
      .populate('internalGuide', 'academicInfo.name email')
      .sort({ createdAt: -1 })

    console.log('Projects returned for user', session.user.id, projects.map(p => ({ id: p._id.toString(), members: p.members.map(m => m.student._id.toString()) })))

    return NextResponse.json({ success: true, projects })
  } catch (error) {
    console.error('Project list error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error', projects: [] }, { status: 500 })
  }
}
// ...existing code...

// HOD actions: approve/reject, assign guides
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })

    if(!canWrite(session.user.role)) return NextResponse.json({ ok:false, error:{ code:'FORBIDDEN', message:'Principal role is read-only' } }, { status:403 })

    await dbConnect()
    const body = await request.json()
  const { projectId, approve, internalGuideId, externalGuide, addMember, removeMember, progressScore, addReport, reportWeek, reportPdfUrl, feedback, feedbackReportId } = body
    const project = await ProjectGroup.findById(projectId)
  if (!project) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 })

    // Add member (student can add to own project; hod/admin can add; leader only)
    if (addMember) {
      if (session.user.role === 'student' && String(project.leader) !== String(session.user.id)) {
  return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only leader can add members' } }, { status: 403 })
      }
      if (!['admin','hod','student'].includes(session.user.role)) {
  return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }, { status: 403 })
      }
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(addMember)
      const lookup = isObjectId ? { _id: addMember } : { email: addMember.toLowerCase() }
      const user = await User.findOne(lookup)
  if (!user || user.role !== 'student') return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Student not found' } }, { status: 400 })
  if (user.department !== project.department) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Department mismatch' } }, { status: 400 })
      const already = project.members.find(m => String(m.student) === String(user._id))
  if (already) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Already a member' } }, { status: 400 })
      project.members.push({ student: user._id, role: 'member' })
      await project.save()
      try { if (global.io) global.io.to(`user-${user._id}`).emit('project:added', { projectId: project._id, groupId: project.groupId }) } catch {}
  return NextResponse.json({ ok: true, data: project })
    }

    if (removeMember) {
      // Leader / admin / hod can remove
      if (!['admin','hod','student'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (session.user.role === 'student' && String(project.leader) !== String(session.user.id)) {
        return NextResponse.json({ error: 'Only leader can remove members' }, { status: 403 })
      }
      const memberDocLookup = /^[0-9a-fA-F]{24}$/.test(removeMember) ? { _id: removeMember } : { email: removeMember.toLowerCase() }
      const memberDoc = await User.findOne(memberDocLookup)
  if (!memberDoc) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Member not found' } }, { status: 400 })
  if (String(memberDoc._id) === String(project.leader)) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Cannot remove leader' } }, { status: 400 })
      const before = project.members.length
      project.members = project.members.filter(m => String(m.student) !== String(memberDoc._id))
  if (project.members.length === before) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Not a member' } }, { status: 400 })
      await project.save()
  return NextResponse.json({ ok: true, data: project })
    }

  if (!['admin','hod'].includes(session.user.role)) {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }, { status: 403 })
    }

    if (typeof approve === 'boolean') {
      project.status = approve ? 'approved' : 'rejected'
    }
    if (internalGuideId) {
      const guide = await User.findById(internalGuideId)
      if (!guide || guide.role !== 'guide') {
        return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid internal guide' } }, { status: 400 })
      }
      project.internalGuide = guide._id
      try {
        global.projectNotifications.unshift({
          type: 'guide-assigned',
            projectId: project._id.toString(),
            groupId: project.groupId,
            title: 'Internal Guide Assigned',
            message: `Guide ${guide.academicInfo?.name || guide.email} assigned to group ${project.groupId}`,
            ts: Date.now()
        })
        global.projectNotifications = global.projectNotifications.slice(0, 200)
      } catch {}
    }
    if (externalGuide) {
      project.externalGuide = externalGuide
    }

    // Progress score (only internal guide, hod, admin)
    if (typeof progressScore === 'number') {
      if(!['admin','hod','guide'].includes(session.user.role)) {
        return NextResponse.json({ ok:false, error:{ code:'FORBIDDEN', message:'Forbidden'}} , { status:403 })
      }
      if(session.user.role==='guide' && String(project.internalGuide) !== String(session.user.id)) {
        return NextResponse.json({ ok:false, error:{ code:'FORBIDDEN', message:'Only assigned guide can update progress'}} , { status:403 })
      }
      project.progressScore = Math.max(0, Math.min(10, progressScore))
    }

    // Add report (students in group OR guide/hod/admin). Provide week & pdf url
    if (addReport && reportPdfUrl) {
      const isMember = project.members.some(m=> String(m.student)===String(session.user.id))
      if(!isMember && !['admin','hod','guide'].includes(session.user.role)) {
        return NextResponse.json({ ok:false, error:{ code:'FORBIDDEN', message:'Cannot add report'}} , { status:403 })
      }
      const week = reportWeek || (project.reports.length+1)
      project.reports.push({ week, pdfUrl: reportPdfUrl, submittedBy: session.user.id })
    }

    // Feedback on report (guide/hod/admin only)
    if (feedback && feedbackReportId) {
      if(!['admin','hod','guide'].includes(session.user.role)) {
        return NextResponse.json({ ok:false, error:{ code:'FORBIDDEN', message:'Forbidden'}} , { status:403 })
      }
      if(session.user.role==='guide' && String(project.internalGuide) !== String(session.user.id)) {
        return NextResponse.json({ ok:false, error:{ code:'FORBIDDEN', message:'Only assigned guide can feedback'}} , { status:403 })
      }
      const rep = project.reports.id(feedbackReportId)
      if(rep){
        rep.feedback = feedback
        rep.feedbackAt = new Date()
        rep.feedbackBy = session.user.id
      }
    }

    await project.save()

  return NextResponse.json({ ok: true, data: project })
  } catch (error) {
    console.error('Project update error:', error)
  return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}

