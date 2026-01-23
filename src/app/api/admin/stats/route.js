import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import ProjectGroup from '@/models/ProjectGroup'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Admin stats - Full session:', JSON.stringify(session, null, 2))
    
    if (!session) {
      console.log('No session found')
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }
    
    if (!session.user) {
      console.log('No user in session')
      return NextResponse.json({ error: 'No user in session' }, { status: 401 })
    }
    
    if (session.user.role !== 'admin') {
      console.log('User role is not admin:', session.user.role)
      return NextResponse.json({ error: 'Not an admin' }, { status: 401 })
    }

    await dbConnect()
    console.log('Database connected for admin stats')

    // Get actual counts from database - count only guides (not HODs)
    const [totalStudents, totalGuides, pendingOnboarding, projectGroups] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'guide' }),
      User.countDocuments({ isOnboarded: false }),
      ProjectGroup.find({}).populate('members', '_id').catch(() => [])
    ])

    console.log('Counts:', { totalStudents, totalGuides, pendingOnboarding, projectGroupsCount: projectGroups.length })

    // Count unique students who are assigned to project groups
    const assignedStudentIds = new Set()
    projectGroups.forEach(group => {
      if (group.members && Array.isArray(group.members)) {
        group.members.forEach(member => {
          if (member && member._id) {
            assignedStudentIds.add(member._id.toString())
          }
        })
      }
    })
    const assignedStudents = assignedStudentIds.size

    const stats = {
      totalStudents,
      totalFaculty: totalGuides,  // Return as totalFaculty for backward compatibility
      pendingOnboarding,
      assignedStudents
    }
    
    console.log('Returning stats:', stats)

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Admin stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
