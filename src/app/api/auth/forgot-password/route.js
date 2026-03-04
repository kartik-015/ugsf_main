import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { createOTPRecord } from '@/lib/otp'
import { sendEmail } from '@/lib/mailer'

const COOLDOWN_MS = 60 * 1000 // 60 seconds between requests
const MAX_REQUESTS = 5 // max reset requests per user

export async function POST(request) {
  try {
    await dbConnect()
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find user — don't reveal whether user exists or not
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      // Return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a reset OTP has been sent.',
      })
    }

    // Rate limiting — cooldown between sends
    const now = Date.now()
    if (
      user.resetPasswordExpires &&
      new Date(user.resetPasswordExpires).getTime() > now &&
      user.emailVerificationLastSent &&
      now - new Date(user.emailVerificationLastSent).getTime() < COOLDOWN_MS
    ) {
      const retryIn = Math.ceil(
        (new Date(user.emailVerificationLastSent).getTime() + COOLDOWN_MS - now) / 1000
      )
      return NextResponse.json(
        { error: `Please wait ${retryIn} seconds before requesting again`, retryIn },
        { status: 429 }
      )
    }

    // Generate OTP for password reset
    const { otp, hash, expires } = createOTPRecord(15) // 15 min TTL

    // Store the hashed OTP in reset fields
    user.resetPasswordToken = hash
    user.resetPasswordExpires = new Date(expires)
    user.emailVerificationLastSent = new Date() // reuse for rate limiting
    await user.save()

    // Send email with OTP
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'EvalProX — Password Reset OTP',
      text: `Your password reset OTP is: ${otp}\n\nThis OTP is valid for 15 minutes. If you did not request a password reset, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px;">
          <h2 style="color: #2563EB;">EvalProX Password Reset</h2>
          <p>You requested a password reset. Use the OTP below:</p>
          <div style="background: #EFF6FF; border: 2px solid #BFDBFE; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1E40AF;">${otp}</span>
          </div>
          <p style="color: #6B7280; font-size: 14px;">This OTP expires in <strong>15 minutes</strong>.</p>
          <p style="color: #9CA3AF; font-size: 12px;">If you did not request this, please ignore this email. Your password will not change.</p>
        </div>
      `,
    })

    if (!emailResult.success && !emailResult.mocked) {
      console.error('[FORGOT-PASSWORD] Failed to send email:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'If the email exists, a reset OTP has been sent.',
      cooldown: COOLDOWN_MS,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
