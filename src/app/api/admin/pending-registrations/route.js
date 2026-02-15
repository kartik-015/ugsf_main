import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { ROLES } from '@/lib/roles'

export const dynamic = 'force-dynamic'

// Get pending registrations (for admin only)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view pending registrations
    if (![ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const role = searchParams.get('role')

    const query = { approvalStatus: status }
    if (role) query.role = role

    const pendingUsers = await User.find(query)
      .select('email role department university institute admissionYear academicInfo createdAt approvalStatus')
      .sort({ createdAt: -1 })
      .limit(100)

    const count = await User.countDocuments({ approvalStatus: 'pending' })

    return NextResponse.json({ 
      users: pendingUsers,
      pendingCount: count
    })

  } catch (error) {
    console.error('Pending registrations GET error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// Approve or reject registration
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can approve/reject
    if (![ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    await dbConnect()

    const { userId, action } = await request.json()

    if (!userId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 })
    }

    const user = await User.findById(userId)

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (user.approvalStatus !== 'pending') {
      return NextResponse.json({ message: 'User already processed' }, { status: 400 })
    }

    if (action === 'approve') {
      user.approvalStatus = 'approved'
      user.isApproved = true
      user.isActive = true
      await user.save()

      return NextResponse.json({ 
        message: 'User approved successfully',
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      })
    } else {
      // Reject - keep user in database but mark as rejected
      user.approvalStatus = 'rejected'
      user.isApproved = false
      user.isActive = false
      await user.save()

      return NextResponse.json({ 
        message: 'User rejected',
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      })
    }

  } catch (error) {
    console.error('Approval POST error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
