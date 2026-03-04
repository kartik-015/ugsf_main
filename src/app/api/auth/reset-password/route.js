import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { hashOTP } from '@/lib/otp'

const MAX_ATTEMPTS = 5

export async function POST(request) {
  try {
    await dbConnect()
    const { email, otp, newPassword } = await request.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: 'Email, OTP, and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Check if there's a valid reset token
    if (!user.resetPasswordToken || !user.resetPasswordExpires) {
      return NextResponse.json(
        { error: 'No password reset was requested. Please request a new OTP.' },
        { status: 400 }
      )
    }

    // Check if OTP expired
    if (Date.now() > new Date(user.resetPasswordExpires).getTime()) {
      user.resetPasswordToken = undefined
      user.resetPasswordExpires = undefined
      await user.save()
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Verify the OTP
    const hashedOTP = hashOTP(otp)
    if (hashedOTP !== user.resetPasswordToken) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
    }

    // OTP is valid — reset the password
    user.password = newPassword // pre-save hook will hash it
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    user.mustChangePassword = false
    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
