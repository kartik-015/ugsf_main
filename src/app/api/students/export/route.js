import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { ROLES } from '@/lib/roles'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import ProjectGroup from '@/models/ProjectGroup'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  if (![ROLES.MAIN_ADMIN, ROLES.ADMIN, ROLES.GUIDE].includes(session.user.role)) return NextResponse.json({ message: 'Access denied' }, { status: 403 })

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const department = searchParams.get('department')
    const semester = searchParams.get('semester')
    const semesterParity = searchParams.get('semesterParity')
    const university = searchParams.get('university')
    const institute = searchParams.get('institute')

    let query = { role: 'student', isActive: true, isRegistered: true, isEmailVerified: true }

  if (session.user.role === 'admin' && session.user.department) {
      if (searchParams.has('department')) {
        if (department) query.department = department
      } else {
        query.department = session.user.department
      }
  } else if (session.user.role === 'guide') {
      if (searchParams.has('department')) {
        if (department) query.department = department
      } else {
        query.department = session.user.department
      }
    } else if (department) {
      query.department = department
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'academicInfo.name': { $regex: search, $options: 'i' } },
        { 'academicInfo.rollNumber': { $regex: search, $options: 'i' } }
      ]
    }

    if (semester) query['academicInfo.semester'] = parseInt(semester)
    if (semesterParity) {
      if (semesterParity === 'odd') query['academicInfo.semester'] = { $in: [1,3,5,7] }
      else if (semesterParity === 'even') query['academicInfo.semester'] = { $in: [2,4,6,8] }
    }
    if (university) query.university = university
    if (institute) query.institute = institute

    const students = await User.find(query).select('-password').sort({ 'academicInfo.name': 1 })

    // Build workbook
    const requested = searchParams.get('fields') ? searchParams.get('fields').split(',') : []
    const baseColumns = [
      { header: 'Name', key: 'name', width: 26 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Department', key: 'department', width: 12 },
      { header: 'Semester', key: 'semester', width: 9 },
      { header: 'Admission Year', key: 'admissionYear', width: 12 },
      { header: 'Roll Number', key: 'roll', width: 14 },
      { header: 'Phone', key: 'phone', width: 14 },
      { header: 'Institute', key: 'institute', width: 14 },
      { header: 'University', key: 'university', width: 14 },
      { header: 'Address', key: 'address', width: 30 }
    ]
    // If requested fields specified, filter to those + always include name/email
    const finalColumns = requested.length ? baseColumns.filter(c => ['name','email'].includes(c.key) || requested.includes(c.key)) : baseColumns
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Students')
    ws.columns = finalColumns
    students.forEach(s => {
      ws.addRow({
        name: s.academicInfo?.name || '',
        email: s.email,
        department: s.department || '',
        semester: s.academicInfo?.semester || '',
        admissionYear: s.admissionYear || '',
        roll: s.academicInfo?.rollNumber || '',
        phone: s.academicInfo?.phoneNumber || '',
        institute: s.institute || '',
        university: s.university || '',
        address: s.academicInfo?.address || ''
      })
    })

    const buffer = await wb.xlsx.writeBuffer()

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="students_export.xlsx"`
      }
    })
  } catch (error) {
    console.error('Students export error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// Accept POST with explicit ids array to export exactly those records
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!['admin','mainadmin','guide','hod','principal','project_coordinator'].includes(session.user.role)) return NextResponse.json({ message: 'Access denied' }, { status: 403 })

    await dbConnect()

    const body = await request.json()
    const ids = Array.isArray(body.ids) ? body.ids : []

    if (!ids.length) return NextResponse.json({ message: 'No ids provided' }, { status: 400 })

    const students = await User.find({ _id: { $in: ids } }).select('-password').sort({ 'academicInfo.name': 1 })

    // Fetch project data including monthly reports with grades
    const projects = await ProjectGroup.find({ 'members.student': { $in: ids } })
      .populate('internalGuide', 'academicInfo.name email')
      .select('title domain status members internalGuide monthlyReports')

    // Month name abbreviations
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    // Build per-student maps: projectMap, gradeMap, monthGradeMap
    const projectMap = {}   // studentId -> first project info
    const monthGradeMap = {}  // studentId -> { "Feb,2026": score }
    const allMonthKeys = new Set()

    projects.forEach(p => {
      // Collect all graded reports for this project
      const gradedReports = (p.monthlyReports || []).filter(r => r.status === 'graded' && r.score != null)

      p.members?.forEach(m => {
        const sid = String(m.student)
        if (!projectMap[sid]) {
          projectMap[sid] = {
            title: p.title,
            domain: p.domain,
            guideName: p.internalGuide?.academicInfo?.name || p.internalGuide?.email || 'NA',
          }
        }
        if (!monthGradeMap[sid]) monthGradeMap[sid] = {}

        gradedReports.forEach(r => {
          const key = `${MONTH_NAMES[r.month - 1]},${r.year}`
          allMonthKeys.add(key)
          monthGradeMap[sid][key] = r.score
        })
      })
    })

    // Sort month columns chronologically
    const sortedMonthKeys = Array.from(allMonthKeys).sort((a, b) => {
      const [ma, ya] = a.split(',')
      const [mb, yb] = b.split(',')
      const ia = Number(ya) * 12 + MONTH_NAMES.indexOf(ma)
      const ib = Number(yb) * 12 + MONTH_NAMES.indexOf(mb)
      return ia - ib
    })

    // Compute overall avg score per student
    const avgScoreMap = {}
    Object.entries(monthGradeMap).forEach(([sid, months]) => {
      const scores = Object.values(months).filter(s => s != null)
      avgScoreMap[sid] = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null
    })

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Students')

    // Fixed columns: Name, Email, ID Number, Semester, Mobile, Overall Grade
    const columns = [
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'ID Number', key: 'roll', width: 14 },
      { header: 'Semester', key: 'semester', width: 10 },
      { header: 'Mobile', key: 'phone', width: 16 },
      { header: 'Overall Grade', key: 'overallGrade', width: 14 },
    ]
    // Dynamic monthly report columns
    sortedMonthKeys.forEach(key => {
      columns.push({ header: key, key: `month_${key}`, width: 12 })
    })
    ws.columns = columns

    // Style header row
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } }

    students.forEach(s => {
      const sid = String(s._id)
      const rowData = {
        name: s.academicInfo?.name || '',
        email: s.email,
        roll: s.academicInfo?.rollNumber || '',
        semester: s.academicInfo?.semester || '',
        phone: s.academicInfo?.phoneNumber || '',
        overallGrade: avgScoreMap[sid] != null ? avgScoreMap[sid] : '',
      }
      // Fill monthly grades (blank if not submitted/graded)
      sortedMonthKeys.forEach(key => {
        const score = monthGradeMap[sid]?.[key]
        rowData[`month_${key}`] = score != null ? score : ''
      })
      ws.addRow(rowData)
    })

    const buffer = await wb.xlsx.writeBuffer()
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="students_export.xlsx"`
      }
    })
  } catch (error) {
    console.error('Students export POST error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
