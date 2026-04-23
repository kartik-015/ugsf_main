import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import { enforceWordLimit, validateSemicolonList } from '@/lib/validation'
import ProjectGroup from '@/models/ProjectGroup'
import User from '@/models/User'
import Notification from '@/models/Notification'
import { canWrite } from '@/lib/permissions'
import { getDepartmentStudentIds } from '@/lib/projectAccess'

// Create a project group (student leader submits)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    if (!canWrite(session.user.role)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Read-only' } }, { status: 403 })

    await dbConnect()
    const body = await request.json()
    let { title, description, domain, technology, members = [], memberEmails = [], memberEmailsString, memberIdsString } = body

    if (!title?.trim()) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Project title is required' } }, { status: 400 })
    if (!domain?.trim()) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Domain is required' } }, { status: 400 })

    // Auto-fetch department and semester from the logged-in user
    const currentUser = await User.findById(session.user.id).select('department academicInfo admissionYear institute')
    if (!currentUser) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 })
    
    let department = (currentUser.department || '').toUpperCase()
    const semester = currentUser.academicInfo?.semester
    if (!department) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Your department is not set. Please contact admin.' } }, { status: 400 })
    if (!semester) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Your semester is not set. Please contact admin.' } }, { status: 400 })

    if (memberEmailsString) {
      const v = validateSemicolonList(memberEmailsString)
      if (!v.ok) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: v.error } }, { status: 400 })
      memberEmails = [...memberEmails, ...v.values]
    }
    if (memberIdsString) {
      const v = validateSemicolonList(memberIdsString)
      if (!v.ok) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: v.error } }, { status: 400 })
      members = [...members, ...v.values]
    }
    if (description) {
      const descCheck = enforceWordLimit(description, 200)
      if (!descCheck.ok) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: descCheck.error } }, { status: 400 })
    }

    const memberIds = [...new Set([
      ...members.map(m => String(m.student || m)),
      ...(await (async () => {
        if (!memberEmails?.length) return []
        const users = await User.find({ email: { $in: memberEmails.map(e => e.toLowerCase()) }, role: 'student' }).select('_id email institute')
        const found = users.map(u => u.email.toLowerCase())
        const missing = memberEmails.filter(e => !found.includes(e.toLowerCase()))
        if (missing.length) throw new Error(`Member emails not found: ${missing.join(', ')}`)
        return users.map(u => String(u._id))
      })())
    ])]

    const memberUsers = await User.find({ _id: { $in: memberIds }, role: 'student' })
    if (memberUsers.length !== memberIds.length) {
      return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid members list' } }, { status: 400 })
    }

    const leaderId = session.user.id
    const allMemberIds = [...new Set([...memberIds, leaderId])]
    if (allMemberIds.length > 4) {
      return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Maximum 4 members per team (including leader)' } }, { status: 400 })
    }

    // Same institute check — reuse currentUser as leader info
    const diffInst = memberUsers.filter(m => m.institute && currentUser.institute && m.institute !== currentUser.institute)
    if (diffInst.length > 0) {
      return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'All team members must be from the same institute' } }, { status: 400 })
    }

    // Duplicate semester project check
    const existingProjects = await ProjectGroup.find({ semester: Number(semester), 'members.student': { $in: allMemberIds }, status: { $nin: ['rejected'] } })
    if (existingProjects.length > 0) {
      const conflictIds = new Set()
      existingProjects.forEach(p => p.members.forEach(m => { if (allMemberIds.includes(String(m.student))) conflictIds.add(String(m.student)) }))
      if (conflictIds.size > 0) {
        const cUsers = await User.find({ _id: { $in: [...conflictIds] } }).select('email academicInfo.name')
        return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: `Already have a project this semester: ${cUsers.map(u => u.academicInfo?.name || u.email).join(', ')}` } }, { status: 400 })
      }
    }

    const finalMembers = allMemberIds.map(id => ({ student: id, role: String(id) === String(leaderId) ? 'leader' : 'member' }))
    const project = new ProjectGroup({ title: title.trim(), description: description?.trim(), domain, technology: technology?.trim(), department, semester: Number(semester), members: finalMembers, leader: leaderId, createdBy: leaderId, status: 'submitted', hodApproval: 'pending', guideStatus: 'not-assigned' })
    await project.save()

    // Notify HOD and Project Coordinators
    const deptStaff = await User.find({ role: { $in: ['hod', 'project_coordinator'] }, department }).select('_id')
    if (deptStaff.length) {
      await Notification.createBulk(deptStaff.map(h => h._id), { type: 'project-submitted', title: 'New Project Submitted', message: `Project "${title}" submitted in ${department} (Sem ${semester})`, link: '/dashboard/projects', relatedProject: project._id, relatedUser: leaderId })
    }

    return NextResponse.json({ ok: true, data: project }, { status: 201 })
  } catch (error) {
    console.error('Project creation error:', error)
    return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: error.message || 'Internal server error' } }, { status: 500 })
  }
}

// List project groups by role
export async function GET(request) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized', projects: [] }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const qDept = searchParams.get('department')
    const qSemester = searchParams.get('semester')
    const qStatus = searchParams.get('status')
    const qYear = searchParams.get('year')
    const role = session.user.role
    let filter = {}
    let departmentScopedStudentIds = []

    if (role === 'student') {
      // Students can only see projects where they are a member
      filter = { 'members.student': session.user.id }
    } else if (role === 'guide') {
      filter = { internalGuide: session.user.id }
    } else if (role === 'hod' || role === 'project_coordinator') {
      // HOD/PC can see any project that includes a student from their department
      departmentScopedStudentIds = await getDepartmentStudentIds(session.user.department)
      filter = departmentScopedStudentIds.length ? { $and: [{ 'members.student': { $in: departmentScopedStudentIds } }] } : { _id: null }
    } else if (role === 'admin' || role === 'principal') {
      // Admin/Principal should only see projects approved by HOD
      filter.hodApproval = 'approved'
      if (qDept) filter.department = qDept.toUpperCase()
    } else if (role === 'mainadmin') {
      if (qDept) filter.department = qDept.toUpperCase()
    }

    if (qSemester) filter.semester = Number(qSemester)
    if (qStatus) filter.status = qStatus
    if (qYear && ['admin', 'hod', 'principal', 'mainadmin', 'project_coordinator'].includes(role)) {
      const yearUsers = await User.find({ admissionYear: Number(qYear) }).select('_id')
      const yearStudentIds = yearUsers.map(u => u._id)
      if (['hod', 'project_coordinator'].includes(role)) {
        filter.$and = [...(filter.$and || []), { 'members.student': { $in: yearStudentIds } }]
      } else {
        filter['members.student'] = { $in: yearStudentIds }
      }
    }

    const projects = await ProjectGroup.find(filter)
      .populate('leader', 'academicInfo.name email department admissionYear university institute')
      .populate('members.student', 'academicInfo.name email department admissionYear university institute')
      .populate('internalGuide', 'academicInfo.name email department')
      .populate('monthlyReports.submittedBy', 'academicInfo.name email')
      .populate('monthlyReports.feedbackBy', 'academicInfo.name email')
      .populate('deadlines.setBy', 'academicInfo.name email')
      .sort({ createdAt: -1 })

    return NextResponse.json({ success: true, projects })
  } catch (error) {
    console.error('Project list error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error', projects: [] }, { status: 500 })
  }
}

// PATCH - All project actions
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    if (!canWrite(session.user.role)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Read-only' } }, { status: 403 })

    await dbConnect()
    const body = await request.json()
    const { projectId } = body
    const project = await ProjectGroup.findById(projectId).populate('leader', 'academicInfo.name email').populate('members.student', 'academicInfo.name email')
    if (!project) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 })
    const role = session.user.role

    // ADD MEMBER
    if (body.addMember) {
      if (!['admin', 'hod', 'project_coordinator', 'student'].includes(role)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }, { status: 403 })
      if (role === 'student' && String(project.leader._id || project.leader) !== String(session.user.id)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only leader can add' } }, { status: 403 })
      if (project.members.length >= 4) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Max 4 members' } }, { status: 400 })
      const isOid = /^[0-9a-fA-F]{24}$/.test(body.addMember)
      const user = await User.findOne(isOid ? { _id: body.addMember } : { email: body.addMember.toLowerCase() })
      if (!user || user.role !== 'student') return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Student not found' } }, { status: 400 })
      if (project.members.find(m => String(m.student._id || m.student) === String(user._id))) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Already a member' } }, { status: 400 })
      project.members.push({ student: user._id, role: 'member' })
      await project.save()
      return NextResponse.json({ ok: true, data: project })
    }

    // REMOVE MEMBER
    if (body.removeMember) {
      if (!['admin', 'hod', 'student'].includes(role)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }, { status: 403 })
      if (role === 'student' && String(project.leader._id || project.leader) !== String(session.user.id)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only leader' } }, { status: 403 })
      const mDoc = await User.findOne(/^[0-9a-fA-F]{24}$/.test(body.removeMember) ? { _id: body.removeMember } : { email: body.removeMember.toLowerCase() })
      if (!mDoc) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Not found' } }, { status: 400 })
      if (String(mDoc._id) === String(project.leader._id || project.leader)) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Cannot remove leader' } }, { status: 400 })
      const before = project.members.length
      project.members = project.members.filter(m => String(m.student._id || m.student) !== String(mDoc._id))
      if (project.members.length === before) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Not a member' } }, { status: 400 })
      await project.save()
      return NextResponse.json({ ok: true, data: project })
    }

    // HOD APPROVAL
    if (body.hodApproval !== undefined) {
      if (role !== 'hod' && role !== 'project_coordinator') return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only HOD or Project Coordinator' } }, { status: 403 })
      if (project.department !== (session.user.department || '').toUpperCase()) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Wrong department' } }, { status: 403 })

      if (project.hodApproval === 'approved' && body.hodApproval === 'rejected') {
        return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Approved project cannot be rejected' } }, { status: 400 })
      }

      if (body.hodApproval === 'rejected') {
        project.hodApproval = 'rejected'
        project.hodRemarks = body.hodRemarks || ''
        project.hodApprovedBy = session.user.id
        project.hodApprovedAt = new Date()
        project.status = 'rejected'
        await project.save()

        // Notify members after rejection is persisted
        const memberIds = project.members.map(m => m.student._id || m.student)
        await Notification.createBulk(memberIds, { type: 'project-rejected', title: 'Project Rejected', message: `Your project "${project.title}" was rejected by HOD.${body.hodRemarks ? ' Remarks: ' + body.hodRemarks : ''}`, link: '/dashboard/projects', relatedProject: project._id })
        return NextResponse.json({ ok: true, data: project })
      }

      project.hodApproval = body.hodApproval
      project.hodRemarks = body.hodRemarks || ''
      project.hodApprovedBy = session.user.id
      project.hodApprovedAt = new Date()
      project.status = 'approved'
      await project.save()
      const memberIds = project.members.map(m => m.student._id || m.student)
      await Notification.createBulk(memberIds, { type: 'project-approved', title: 'Project Approved', message: `Project "${project.title}" approved by HOD.${body.hodRemarks ? ' Remarks: ' + body.hodRemarks : ''}`, link: '/dashboard/projects', relatedProject: project._id })
      return NextResponse.json({ ok: true, data: project })
    }

    // ASSIGN GUIDE
    if (body.internalGuideId) {
      if (!['admin', 'hod', 'project_coordinator', 'mainadmin'].includes(role)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }, { status: 403 })
      if (project.hodApproval !== 'approved') return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Must be approved first' } }, { status: 400 })
      const guide = await User.findById(body.internalGuideId)
      if (!guide || guide.role !== 'guide') return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid guide' } }, { status: 400 })
      project.internalGuide = guide._id
      project.guideStatus = 'pending'
      project.status = 'under-review'
      await project.save()
      await Notification.createAndEmit({ recipient: guide._id, type: 'guide-assigned', title: 'New Project Assignment', message: `Assigned as guide for "${project.title}" (${project.department}, Sem ${project.semester}). Please accept/reject.`, link: '/dashboard/projects', relatedProject: project._id })
      const memberIds = project.members.map(m => m.student._id || m.student)
      await Notification.createBulk(memberIds, { type: 'guide-assigned', title: 'Guide Assigned', message: `${guide.academicInfo?.name || guide.email} assigned as guide for "${project.title}".`, link: '/dashboard/projects', relatedProject: project._id })
      return NextResponse.json({ ok: true, data: project })
    }

    // GUIDE ACCEPT/REJECT
    if (body.guideResponse) {
      if (role !== 'guide') return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only guide' } }, { status: 403 })
      if (String(project.internalGuide) !== String(session.user.id)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Not your project' } }, { status: 403 })
      const accepted = body.guideResponse === 'accepted'
      project.guideStatus = accepted ? 'accepted' : 'rejected'
      project.guideRemarks = body.guideRemarks || ''
      project.guideRespondedAt = new Date()
      if (accepted) { project.status = 'in-progress' } else { project.internalGuide = null; project.guideStatus = 'not-assigned'; project.status = 'approved' }
      await project.save()
      const memberIds = project.members.map(m => m.student._id || m.student)
      await Notification.createBulk(memberIds, { type: accepted ? 'guide-accepted' : 'guide-rejected', title: accepted ? 'Guide Accepted' : 'Guide Declined', message: `Guide ${accepted ? 'accepted' : 'declined'} "${project.title}".${body.guideRemarks ? ' Remarks: ' + body.guideRemarks : ''}`, link: '/dashboard/projects', relatedProject: project._id })
      const hods = await User.find({ role: 'hod', department: project.department }).select('_id')
      if (hods.length) await Notification.createBulk(hods.map(h => h._id), { type: accepted ? 'guide-accepted' : 'guide-rejected', title: `Guide ${accepted ? 'Accepted' : 'Rejected'}`, message: `Guide ${accepted ? 'accepted' : 'rejected'} "${project.title}".`, link: '/dashboard/projects', relatedProject: project._id })
      return NextResponse.json({ ok: true, data: project })
    }

    // SET DEADLINE — feature disabled
    if (body.setDeadline) {
      return NextResponse.json({ ok: false, error: { code: 'DISABLED', message: 'Deadline feature is disabled' } }, { status: 400 })
    }

    // SUBMIT MONTHLY REPORT (create draft or replace existing draft)
    if (body.submitReport) {
      // Block report submission until HOD approves the project
      if (project.hodApproval !== 'approved') return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Cannot submit reports until the HOD approves your project' } }, { status: 403 })
      const isMember = project.members.some(m => String(m.student._id || m.student) === String(session.user.id))
      if (!isMember) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only members can submit' } }, { status: 403 })
      const { month, year, title, pdfUrl } = body.submitReport
      if (!month || !year || !title || !pdfUrl) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'All fields required' } }, { status: 400 })
      
      const existing = project.monthlyReports.find(r => r.month === month && r.year === year)
      if (existing) {
        // Can only replace if not turned in yet
        if (existing.turnedIn) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Report already turned in. Cannot replace.' } }, { status: 400 })
        existing.title = title
        existing.pdfUrl = pdfUrl
        existing.submittedBy = session.user.id
        existing.replacedAt = new Date()
      } else {
        project.monthlyReports.push({ month, year, title, pdfUrl, submittedBy: session.user.id, status: 'draft', turnedIn: false })
      }
      await project.save()
      return NextResponse.json({ ok: true, data: project })
    }

    // TURN IN REPORT (locks it, makes it visible to guide)
    if (body.turnInReport) {
      // Block turning in reports until HOD approves the project
      if (project.hodApproval !== 'approved') return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Cannot turn in reports until the HOD approves your project' } }, { status: 403 })
      const isMember = project.members.some(m => String(m.student._id || m.student) === String(session.user.id))
      if (!isMember) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only members can turn in' } }, { status: 403 })
      const report = project.monthlyReports.id(body.turnInReport)
      if (!report) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Report not found' } }, { status: 404 })
      if (report.turnedIn) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Already turned in' } }, { status: 400 })
      report.turnedIn = true
      report.turnedInAt = new Date()
      report.status = 'submitted'
      await project.save()
      if (project.internalGuide) await Notification.createAndEmit({ recipient: project.internalGuide, type: 'report-submitted', title: 'Report Submitted', message: `Team "${project.title}" submitted report for ${report.month}/${report.year}.`, link: '/dashboard/projects', relatedProject: project._id })
      return NextResponse.json({ ok: true, data: project })
    }

    // GRADE REPORT
    if (body.gradeReport) {
      if (role !== 'guide' || String(project.internalGuide) !== String(session.user.id)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only assigned guide' } }, { status: 403 })
      const { reportId, grade, score, feedback, reportStatus } = body.gradeReport
      const report = project.monthlyReports.id(reportId)
      if (!report) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Report not found' } }, { status: 404 })
      if (!report.turnedIn) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Report has not been turned in yet' } }, { status: 400 })
      if (grade) report.grade = grade
      if (score !== undefined) report.score = Math.max(0, Math.min(10, score))
      if (feedback) report.feedback = feedback
      report.feedbackAt = new Date()
      report.feedbackBy = session.user.id
      report.status = reportStatus || 'graded'
      // Auto-compute progressScore from graded reports
      const graded = project.monthlyReports.filter(r => r.status === 'graded' && r.score !== undefined && r.score !== null)
      if (graded.length > 0) {
        project.progressScore = Math.round((graded.reduce((sum, r) => sum + r.score, 0) / graded.length) * 10) / 10
      }
      await project.save()
      const memberIds = project.members.map(m => m.student._id || m.student)
      await Notification.createBulk(memberIds, { type: 'report-graded', title: 'Report Graded', message: `Report graded for "${project.title}".${grade ? ' Grade: ' + grade : ''}`, link: '/dashboard/projects', relatedProject: project._id })
      return NextResponse.json({ ok: true, data: project })
    }

    // PROGRESS SCORE
    if (body.progressScore !== undefined) {
      if (!['admin', 'hod', 'project_coordinator', 'guide'].includes(role)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }, { status: 403 })
      if (role === 'guide' && String(project.internalGuide) !== String(session.user.id)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only assigned guide' } }, { status: 403 })
      project.progressScore = Math.max(0, Math.min(100, body.progressScore))
      await project.save()
      return NextResponse.json({ ok: true, data: project })
    }

    // EXTERNAL GUIDE
    if (body.externalGuide) {
      if (!['admin', 'hod', 'project_coordinator', 'mainadmin'].includes(role)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }, { status: 403 })
      project.externalGuide = body.externalGuide
      await project.save()
      return NextResponse.json({ ok: true, data: project })
    }

    // MODIFY PROJECT (student one-time edit)
    if (body.modifyProject) {
      if (role !== 'student') return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only students can modify' } }, { status: 403 })
      const isLeader = String(project.leader._id || project.leader) === String(session.user.id)
      if (!isLeader) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only leader can modify' } }, { status: 403 })
      if (project.hasBeenModified) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Project can only be modified once' } }, { status: 400 })
      
      const { title, description, domain, technology } = body.modifyProject
      if (title) project.title = title.trim()
      if (description) project.description = description.trim()
      if (domain) project.domain = domain.trim()
      if (technology) project.technology = technology.trim()
      project.hasBeenModified = true
      project.modifiedAt = new Date()
      project.modifiedBy = session.user.id
      await project.save()
      return NextResponse.json({ ok: true, data: project })
    }

    return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'No valid action' } }, { status: 400 })
  } catch (error) {
    console.error('Project update error:', error)
    return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: error.message || 'Server error' } }, { status: 500 })
  }
}

