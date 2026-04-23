import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { ROLES } from '@/lib/roles'
import { validatePhone, validateName, validateRollNumber } from '@/lib/validation'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import ProjectGroup from '@/models/ProjectGroup'
import { sanitizeString, escapeRegExp } from '@/lib/security'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('🔐 Students API called by:', session?.user?.email, 'Role:', session?.user?.role)
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

  if (![ROLES.MAIN_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.HOD, ROLES.GUIDE, ROLES.PROJECT_COORDINATOR].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const department = searchParams.get('department')
    const semester = searchParams.get('semester')
  const semesterParity = searchParams.get('semesterParity')
  const university = searchParams.get('university')
  const institute = searchParams.get('institute')
  const admissionYear = searchParams.get('admissionYear')


    let query = { role: 'student', isActive: true, isRegistered: true, isEmailVerified: true }

    // Department filtering logic
    if ((session.user.role === ROLES.HOD || session.user.role === ROLES.PROJECT_COORDINATOR) && session.user.department) {
      // HOD/Coordinator: ALWAYS restricted to their own department
      query.department = session.user.department
    } else if (session.user.role === ROLES.GUIDE && session.user.department) {
      // Guide: if department filter provided, use it; otherwise default to guide's department
      if (searchParams.has('department') && department) {
        query.department = department
      } else if (!searchParams.has('department')) {
        query.department = session.user.department
      }
    } else if (department) {
      // For admins, principals, and others: only filter if department is explicitly provided
      query.department = department
    }

    // Additional filters
    if (search) {
      const safeSearch = escapeRegExp(sanitizeString(search))
      query.$or = [
        { email: { $regex: safeSearch, $options: 'i' } },
        { 'academicInfo.name': { $regex: safeSearch, $options: 'i' } },
        { 'academicInfo.rollNumber': { $regex: safeSearch, $options: 'i' } }
      ]
    }

    if (semester) {
      query['academicInfo.semester'] = parseInt(semester)
    }

    if (semesterParity) {
      if (semesterParity === 'odd') {
        query['academicInfo.semester'] = { $in: [1,3,5,7] }
      } else if (semesterParity === 'even') {
        query['academicInfo.semester'] = { $in: [2,4,6,8] }
      }
    }

    if (admissionYear) {
      const yr = parseInt(admissionYear, 10)
      if (!isNaN(yr)) query.admissionYear = yr
    }

    if (university) query.university = university
    if (institute) query.institute = institute

    // Debug logging
    console.log('📊 Students API Query:', JSON.stringify(query, null, 2))
    console.log('🔍 Search params:', { search, department, semester, university, institute })

    const students = await User.find(query)
      .select('-password')
      .sort({ 'academicInfo.rollNumber': 1, 'academicInfo.name': 1 })
      .lean()

    console.log(`Found ${students.length} students`)

    // For admin, mainadmin, principal, hod include project membership summary
  if ([ROLES.ADMIN, ROLES.MAIN_ADMIN, ROLES.PRINCIPAL, ROLES.HOD, ROLES.PROJECT_COORDINATOR].includes(session.user.role)) {
      const studentIds = students.map(s => s._id)
      const groups = await ProjectGroup.find({ 'members.student': { $in: studentIds } }).select('groupId members')
      const membership = {}
      groups.forEach(g => {
        g.members.forEach(m => {
          const key = String(m.student)
          if (!membership[key]) membership[key] = []
          membership[key].push(g.groupId)
        })
      })
      return NextResponse.json({ students, projectMemberships: membership })
    }

    return NextResponse.json({ students })

  } catch (error) {
    console.error('Students GET error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

  if (![ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    await dbConnect()

  const body = await request.json()
  const { email, password, name, department, admissionYear, semester, batch, rollNumber, phoneNumber, address } = body

    // Validate required fields
    if (!email || !password || !name || !department || !admissionYear) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }
    if(!validateName(name)) {
      return NextResponse.json({ message: 'Invalid name format' }, { status:400 })
    }
    if (phoneNumber && !validatePhone(phoneNumber)) {
      return NextResponse.json({ message: 'Invalid phone number (must start with +91...)' }, { status: 400 })
    }
    if(rollNumber && !validateRollNumber(rollNumber)) {
      return NextResponse.json({ message: 'Invalid roll number format (expected e.g. 23CSE001)' }, { status:400 })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 })
    }

    const student = new User({
      email: email.toLowerCase(),
      password,
      role: 'student',
      department,
      admissionYear: parseInt(admissionYear),
      academicInfo: {
        name,
        semester: semester ? parseInt(semester) : undefined,
        batch,
        rollNumber,
        phoneNumber,
        address,
      },
      // counselor assignment removed
      isRegistered: false
    })

    await student.save()

    return NextResponse.json({ 
      message: 'Student created successfully',
      student: {
        id: student._id,
        email: student.email,
        role: student.role,
        department: student.department,
        academicInfo: student.academicInfo,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Students POST error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
