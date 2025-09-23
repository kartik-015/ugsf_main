import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function GET(request) {
  try {
    await dbConnect()
    
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users except admin
    const registrations = await User.find({ role: { $ne: 'admin' } })
      .sort({ createdAt: -1 })

    return NextResponse.json({ 
      registrations,
      success: true 
    })

  } catch (error) {
    console.error('Error fetching registrations:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message }, 
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  try {
    await dbConnect()

    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, approve, role } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (approve) {
      user.isApproved = true
      user.approvalStatus = 'approved'
      user.isActive = true
  if (role && ['guide', 'hod', 'student'].includes(role)) {
        user.role = role
      }
    } else {
      user.isApproved = false
      user.approvalStatus = 'rejected'
      user.isActive = false
    }

    await user.save()

    return NextResponse.json({ success: true, user: {
      id: user._id,
      role: user.role,
      approvalStatus: user.approvalStatus,
      isActive: user.isActive
    }})
  } catch (error) {
    console.error('Error approving registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}