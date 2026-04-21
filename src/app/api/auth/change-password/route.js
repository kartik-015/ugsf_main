import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { createOTPRecord, hashOTP } from '@/lib/otp'
import { sendEmail } from '@/lib/mailer'

const OTP_MAX_ATTEMPTS = 5

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const body = await request.json().catch(() => ({}))
    const action = body.action || (body.otp ? 'verify-otp' : 'change')
    const { currentPassword, newPassword, otp } = body

    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (action === 'send-otp') {
      const otpData = createOTPRecord(10)
      user.passwordChangeOTP = otpData.hash
      user.passwordChangeOTPExpires = new Date(otpData.expires)
      user.passwordChangeOTPAttemptCount = 0
      user.passwordChangeOTPResendCount = (user.passwordChangeOTPResendCount || 0) + 1
      user.passwordChangeOTPLastSent = new Date()
      await user.save()

      await sendEmail({
        to: user.email,
        subject: 'EvalProX - Password Change OTP',
        text: `Your password change OTP is ${otpData.otp}. It expires in 10 minutes.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
          <h2 style="color:#2563eb">EvalProX - Password Change Verification</h2>
          <p>Your password change OTP is:</p>
          <div style="background:#f1f5f9;padding:16px;border-radius:8px;text-align:center;margin:16px 0">
            <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1e40af">${otpData.otp}</span>
          </div>
          <p style="color:#64748b;font-size:14px">This OTP expires in 10 minutes. Do not share it with anyone.</p>
        </div>`,
      })

      return NextResponse.json({ success: true, message: 'OTP sent to your email' })
    }

    if (action === 'verify-otp') {
      if (!otp || !newPassword) {
        return NextResponse.json({ error: 'OTP and new password are required' }, { status: 400 })
      }

      if (!user.passwordChangeOTP || !user.passwordChangeOTPExpires) {
        return NextResponse.json({ error: 'No OTP requested. Please request a new OTP.' }, { status: 400 })
      }

      if (Date.now() > new Date(user.passwordChangeOTPExpires).getTime()) {
        user.passwordChangeOTP = undefined
        user.passwordChangeOTPExpires = undefined
        user.passwordChangeOTPAttemptCount = 0
        await user.save()
        return NextResponse.json({ error: 'OTP expired. Please request a new one.' }, { status: 400 })
      }

      if ((user.passwordChangeOTPAttemptCount || 0) >= OTP_MAX_ATTEMPTS) {
        return NextResponse.json({ error: 'Too many attempts. Please request a new OTP.' }, { status: 429 })
      }

      if (hashOTP(otp) !== user.passwordChangeOTP) {
        user.passwordChangeOTPAttemptCount = (user.passwordChangeOTPAttemptCount || 0) + 1
        await user.save()
        return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
      }

      const isSame = await user.comparePassword(newPassword)
      if (isSame) {
        return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 })
      }

      user.password = newPassword
      user.mustChangePassword = false
      user.passwordChangeOTP = undefined
      user.passwordChangeOTPExpires = undefined
      user.passwordChangeOTPAttemptCount = 0
      user.passwordChangeOTPLastSent = undefined
      await user.save()

      return NextResponse.json({ success: true, message: 'Password changed successfully' })
    }

    if (user.mustChangePassword) {
      return NextResponse.json({ error: 'Please verify the OTP sent to your email before changing your password.' }, { status: 400 })
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    }

    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    }

    const isValidCurrent = await user.comparePassword(currentPassword)
    if (!isValidCurrent) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const isSame = await user.comparePassword(newPassword)
    if (isSame) {
      return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 })
    }

    user.password = newPassword
    user.mustChangePassword = false
    user.passwordChangeOTP = undefined
    user.passwordChangeOTPExpires = undefined
    user.passwordChangeOTPAttemptCount = 0
    user.passwordChangeOTPLastSent = undefined
    await user.save()

    return NextResponse.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    user.passwordChangeOTP = undefined
    user.passwordChangeOTPExpires = undefined
    user.passwordChangeOTPAttemptCount = 0
    user.passwordChangeOTPLastSent = undefined
    await user.save()

    return NextResponse.json({ success: true, message: 'Password change skipped' })
  } catch (error) {
    console.error('Skip password change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}