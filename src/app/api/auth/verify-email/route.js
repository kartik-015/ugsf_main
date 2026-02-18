import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { hashOTP } from '@/lib/otp'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 10

export async function POST(request) {
  try {
    await dbConnect()
    const { email, otp } = await request.json()
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP required' }, { status: 400 })
    }
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.isEmailVerified) return NextResponse.json({ success: true, message: 'Already verified' })
    if (!user.emailVerificationOTP || !user.emailVerificationExpires) {
      return NextResponse.json({ error: 'OTP not generated' }, { status: 400 })
    }
    if (Date.now() > new Date(user.emailVerificationExpires).getTime()) {
      return NextResponse.json({ error: 'OTP expired' }, { status: 400 })
    }
    // Lockout check
    if (user.emailVerificationAttemptCount && user.emailVerificationAttemptCount >= MAX_ATTEMPTS) {
      // If last sent time + lock window passed, reset attempts
      if (user.emailVerificationLastSent && (Date.now() - new Date(user.emailVerificationLastSent).getTime()) > LOCK_MINUTES * 60 * 1000) {
        user.emailVerificationAttemptCount = 0
      } else {
        return NextResponse.json({ error: 'Too many attempts. Please request a new OTP or wait.' }, { status: 429 })
      }
    }

    const provided = hashOTP(otp)
    if (provided !== user.emailVerificationOTP) {
      user.emailVerificationAttemptCount = (user.emailVerificationAttemptCount || 0) + 1
      await user.save()
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
    }
    user.isEmailVerified = true
    user.isRegistered = true // Finalize registration after email verification
    user.emailVerificationOTP = undefined
    user.emailVerificationExpires = undefined
    user.emailVerificationAttemptCount = 0
    await user.save()
    return NextResponse.json({ success: true, message: 'Email verified successfully! Your default password is depstar@123. You can now login.' })
  } catch (e) {
    console.error('Verify email error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
