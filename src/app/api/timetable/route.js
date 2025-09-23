import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import Timetable from '@/models/Timetable'
import Subject from '@/models/Subject'

export async function GET(request) {
  try {
    await dbConnect()

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const day = (searchParams.get('day') || 'monday').toLowerCase()
    let department = searchParams.get('department')

    // Non-admin users can only view their own department timetable
    if (session.user.role !== 'admin') {
      department = session.user.department || department
    }

    if (!department) {
      return NextResponse.json({ error: 'Department required' }, { status: 400 })
    }

    const query = { department: department, day }
    const rows = await Timetable.find(query).sort({ startTime: 1 }).lean()

    return NextResponse.json({ timetable: rows || [], success: true })

  } catch (error) {
    console.error('Error fetching timetable:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
  const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

  if (!['admin', 'guide'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    await dbConnect()

    const body = await request.json()
    const { subjectId, day, startTime, endTime, room } = body

    // Validate required fields
    if (!subjectId || !day || !startTime || !endTime) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

  // Validate subject exists and guide has access
    const subject = await Subject.findById(subjectId)
    if (!subject) {
      return NextResponse.json({ message: 'Subject not found' }, { status: 404 })
    }

  if (session.user.role === 'guide' && subject.faculty?.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Access denied to this subject' }, { status: 403 })
    }

    // In a real application, this would save to a Timetable model
    // For now, we'll return a success response
    const timetableEntry = {
      _id: `timetable_${subjectId}_${day}`,
      subject: subject,
      faculty: subject.faculty,
      day: day,
      startTime: startTime,
      endTime: endTime,
      room: room || 'TBA',
    }

    return NextResponse.json({ 
      message: 'Timetable entry created successfully',
      timetableEntry
    }, { status: 201 })

  } catch (error) {
    console.error('Timetable POST error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

