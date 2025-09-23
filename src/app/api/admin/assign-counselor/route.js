import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function POST(request) {
  try {
    await dbConnect()
    
    const session = await getServerSession(authOptions)
    if (!session || !['admin','hod'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { studentId, counselorId } = body

    if (!studentId || !counselorId) {
      return NextResponse.json(
        { error: 'Student ID and Counselor ID are required' }, 
        { status: 400 }
      )
    }

    // Verify student exists
    const student = await User.findById(studentId)
    if (!student || student.role !== 'student') {
      return NextResponse.json(
        { error: 'Student not found' }, 
        { status: 404 }
      )
    }

    // If HOD, ensure same department
    if (session.user.role === 'hod' && student.department !== session.user.department) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

  // Verify assignee exists and is academic staff (guide/hod)
    const counselor = await User.findById(counselorId)
      if (!counselor || !['guide','hod'].includes(counselor.role)) {
      return NextResponse.json(
        { error: 'Assignee not found or invalid role' }, 
        { status: 404 }
      )
    }

    // Assign counselor to student
    student.counselor = counselorId
    await student.save()

    return NextResponse.json({ 
      success: true,
      message: 'Counselor assigned successfully',
      student: {
        id: student._id,
        name: student.academicInfo?.name || student.email,
        counselor: {
          id: counselor._id,
          name: counselor.academicInfo?.name || counselor.email
        }
      }
    })

  } catch (error) {
    console.error('Error assigning counselor:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
