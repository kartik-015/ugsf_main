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

    let query = { role: 'student', isActive: true }

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
    const visibleFields = Array.isArray(body.fields) ? body.fields : []

    let students = []
    if (ids.length > 0) {
      students = await User.find({ _id: { $in: ids } }).select('-password').sort({ 'academicInfo.name': 1 })
    } else {
      return NextResponse.json({ message: 'No ids provided' }, { status: 400 })
    }

    // Fetch project data for students
    const projects = await ProjectGroup.find({ 'members.student': { $in: ids } })
      .populate('internalGuide', 'academicInfo.name email')
      .select('title domain status members internalGuide')
    const projectMap = {}
    projects.forEach(p => {
      p.members?.forEach(m => {
        const sid = String(m.student)
        if (!projectMap[sid]) projectMap[sid] = []
        projectMap[sid].push({
          title: p.title,
          domain: p.domain,
          status: p.status,
          guideName: p.internalGuide?.academicInfo?.name || p.internalGuide?.email || ''
        })
      })
    })

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Students')

    // Build columns based on visible fields
    const columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
    ]
    if (visibleFields.includes('roll')) columns.push({ header: 'Roll Number', key: 'roll', width: 15 })
    if (visibleFields.includes('phone')) columns.push({ header: 'Phone', key: 'phone', width: 15 })
    if (visibleFields.includes('semester')) columns.push({ header: 'Semester', key: 'semester', width: 10 })
    if (visibleFields.includes('department')) columns.push({ header: 'Department', key: 'department', width: 15 })
    if (visibleFields.includes('interests')) columns.push({ header: 'Domain Interests', key: 'interests', width: 30 })
    if (visibleFields.includes('projectTitle')) columns.push({ header: 'Project Title', key: 'projectTitle', width: 30 })
    if (visibleFields.includes('projectDomain')) columns.push({ header: 'Project Domain', key: 'projectDomain', width: 20 })
    if (visibleFields.includes('projectStatus')) columns.push({ header: 'Project Status', key: 'projectStatus', width: 15 })
    if (visibleFields.includes('guideName')) columns.push({ header: 'Guide', key: 'guideName', width: 25 })
    if (visibleFields.includes('address')) columns.push({ header: 'Address', key: 'address', width: 30 })
    // Fallback if no visible fields
    if (columns.length <= 2) {
      columns.push(
        { header: 'Department', key: 'department', width: 15 },
        { header: 'Semester', key: 'semester', width: 10 },
        { header: 'Roll Number', key: 'roll', width: 15 }
      )
    }
    ws.columns = columns

    students.forEach(s => {
      const proj = projectMap[String(s._id)]?.[0]
      ws.addRow({
        name: s.academicInfo?.name || '',
        email: s.email,
        department: s.department || '',
        semester: s.academicInfo?.semester || '',
        roll: s.academicInfo?.rollNumber || '',
        phone: s.academicInfo?.phoneNumber || '',
        interests: (s.interests || []).join(', ') || 'NA',
        projectTitle: proj?.title || 'NA',
        projectDomain: proj?.domain || 'NA',
        projectStatus: proj?.status || 'NA',
        guideName: proj?.guideName || 'NA',
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
    console.error('Students export POST error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
