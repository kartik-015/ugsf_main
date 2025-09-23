import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import dbConnect from '@/lib/mongodb'
import Subject from '@/models/Subject'
import User from '@/models/User'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const semester = searchParams.get('semester')

    let query = { isActive: true }

    // Filter by role
    if (session.user.role === 'student') {
      query.department = session.user.department
      if (session.user.academicInfo?.semester) {
        query.semester = session.user.academicInfo.semester
      }
    } else if (session.user.role === 'guide') {
      query.faculty = session.user.id
    }

    // Additional filters
    if (department) query.department = department
    if (semester) query.semester = parseInt(semester)

    const subjects = await Subject.find(query)
      .populate('faculty', 'email academicInfo.name')
      .sort({ code: 1 })

  return NextResponse.json({ ok: true, data: subjects })

  } catch (error) {
    console.error('Subjects GET error:', error)
  return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }

  if (![ 'admin', 'mainadmin', 'guide' ].includes(session.user.role)) {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 })
    }

    await dbConnect()

    const body = await request.json()
    const { code, name, department, semester, credits, description, syllabus, faculty } = body

    // Validate required fields
    if (!code || !name || !department || !semester || !credits) {
      return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields' } }, { status: 400 })
    }

    // Check if subject code already exists
    const existingSubject = await Subject.findOne({ code })
    if (existingSubject) {
      return NextResponse.json({ ok: false, error: { code: 'DUPLICATE', message: 'Subject code already exists' } }, { status: 400 })
    }

    // Validate faculty exists if provided
    let facultyId = faculty
    if (faculty && ['admin','mainadmin'].includes(session.user.role)) {
      const guideUser = await User.findById(faculty)
      if (!guideUser || guideUser.role !== 'guide') {
        return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid guide ID' } }, { status: 400 })
      }
    } else if (session.user.role === 'guide') {
      facultyId = session.user.id
    }

    const subject = new Subject({
      code,
      name,
      department,
      semester: parseInt(semester),
      credits: parseInt(credits),
      description,
      syllabus,
      faculty: facultyId,
    })

    await subject.save()

    return NextResponse.json({ 
      ok: true,
      data: {
        id: subject._id,
        code: subject.code,
        name: subject.name,
        department: subject.department,
        semester: subject.semester,
        credits: subject.credits,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Subjects POST error:', error)
  return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
} 