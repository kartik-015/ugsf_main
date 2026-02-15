import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import Rubric from '@/models/Rubric'

export const dynamic = 'force-dynamic'

// GET - List rubrics for a department
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department') || session.user.department
    const role = session.user.role
    
    // Guides, HOD, PC, admin can view rubrics
    if (!['guide', 'hod', 'project_coordinator', 'admin', 'mainadmin', 'student'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const filter = { isActive: true }
    if (department) filter.department = department
    
    const rubrics = await Rubric.find(filter)
      .populate('createdBy', 'academicInfo.name email role')
      .sort({ createdAt: -1 })
    
    return NextResponse.json({ rubrics })
  } catch (error) {
    console.error('Rubrics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create rubric (HOD/PC only)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const role = session.user.role
    if (!['hod', 'project_coordinator', 'admin', 'mainadmin'].includes(role)) {
      return NextResponse.json({ error: 'Only HOD or Project Coordinator can create rubrics' }, { status: 403 })
    }
    
    await dbConnect()
    const body = await request.json()
    const { title, criteria, semester } = body
    
    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (!criteria?.length) return NextResponse.json({ error: 'At least one criterion is required' }, { status: 400 })
    
    const department = session.user.department || 'IT'
    const totalMaxScore = 10 // Always out of 10
    
    const rubric = await Rubric.create({
      title: title.trim(),
      department,
      semester: semester || undefined,
      criteria: criteria.map(c => ({
        name: c.name,
        maxScore: c.maxScore || 10,
        description: c.description || '',
      })),
      totalMaxScore,
      createdBy: session.user.id,
    })
    
    return NextResponse.json({ rubric }, { status: 201 })
  } catch (error) {
    console.error('Rubrics POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Deactivate rubric
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const role = session.user.role
    if (!['hod', 'project_coordinator', 'admin', 'mainadmin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const rubricId = searchParams.get('id')
    
    if (!rubricId) return NextResponse.json({ error: 'Rubric ID required' }, { status: 400 })
    
    await Rubric.findByIdAndUpdate(rubricId, { isActive: false })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Rubrics DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
