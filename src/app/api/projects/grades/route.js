import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import ProjectGroup from '@/models/ProjectGroup'

export const dynamic = 'force-dynamic'

/**
 * GET /api/projects/grades
 * Returns individual student grades from project groups.
 * Used by HOD to see grades of all students in their department.
 * Each student in a group gets the same grade as the group report.
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = session.user.role
    if (!['hod', 'project_coordinator', 'admin', 'mainadmin', 'principal'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const qDept = searchParams.get('department')
    const qSemester = searchParams.get('semester')

    let filter = {}
    if (role === 'hod' || role === 'project_coordinator') {
      filter.department = (session.user.department || '').toUpperCase()
    }
    if (qDept) filter.department = qDept.toUpperCase()
    if (qSemester) filter.semester = Number(qSemester)

    const projects = await ProjectGroup.find(filter)
      .populate('members.student', 'academicInfo.name academicInfo.rollNumber email department')
      .populate('internalGuide', 'academicInfo.name email')
      .select('title groupId department semester members monthlyReports internalGuide progressScore')
      .sort({ department: 1, semester: 1 })

    // Build individual student grade rows
    const studentGrades = []
    for (const project of projects) {
      const gradedReports = (project.monthlyReports || []).filter(r => r.status === 'graded')
      const avgScore = gradedReports.length > 0
        ? Math.round((gradedReports.reduce((s, r) => s + (r.score || 0), 0) / gradedReports.length) * 10) / 10
        : null

      for (const member of project.members) {
        const student = member.student
        if (!student) continue

        studentGrades.push({
          studentId: student._id,
          studentName: student.academicInfo?.name || 'Unknown',
          rollNumber: student.academicInfo?.rollNumber || '',
          email: student.email,
          department: student.department || project.department,
          projectTitle: project.title,
          groupId: project.groupId,
          semester: project.semester,
          role: member.role, // leader or member
          guideName: project.internalGuide?.academicInfo?.name || project.internalGuide?.email || 'Not assigned',
          totalReports: (project.monthlyReports || []).length,
          gradedReports: gradedReports.length,
          avgScore,
          progressScore: project.progressScore || 0,
          reportDetails: gradedReports.map(r => ({
            month: r.month,
            year: r.year,
            score: r.score,
            grade: r.grade,
            feedback: r.feedback,
          })),
        })
      }
    }

    return NextResponse.json({ success: true, studentGrades })
  } catch (error) {
    console.error('Grades API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
