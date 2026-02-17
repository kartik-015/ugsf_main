import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const { currentPassword, newPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    }

    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If user must change password (first login), verify current password is the default
    if (user.mustChangePassword) {
      const isValidCurrent = await user.comparePassword(currentPassword)
      if (!isValidCurrent) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
    } else {
      // Normal password change
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }
      const isValidCurrent = await user.comparePassword(currentPassword)
      if (!isValidCurrent) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
    }

    // Check new password is different from current
    const isSame = await user.comparePassword(newPassword)
    if (isSame) {
      return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 })
    }

    user.password = newPassword
    user.mustChangePassword = false
    await user.save()

    return NextResponse.json({ 
      success: true, 
      message: 'Password changed successfully' 
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Skip password change — just clear the mustChangePassword flag
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    user.mustChangePassword = false
    await user.save()

    return NextResponse.json({ success: true, message: 'Password change skipped' })
  } catch (error) {
    console.error('Skip password change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}