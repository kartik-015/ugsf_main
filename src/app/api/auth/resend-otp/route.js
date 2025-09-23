import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { createOTPRecord } from '@/lib/otp'
import { sendEmail } from '@/lib/mailer'

const COOLDOWN_MS = 60 * 1000
const MAX_RESENDS = 5

export async function POST(request) {
  try {
    await dbConnect()
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }
    const user = await User.findOne({ email: email.toLowerCase() })
    // Always return ok to avoid leaking user existence
    if (!user) {
      return NextResponse.json({ ok: true })
    }
    if (user.isEmailVerified) {
      return NextResponse.json({ error: 'Already verified' }, { status: 400 })
    }

    const now = Date.now()
    if (user.emailVerificationLastSent && (now - new Date(user.emailVerificationLastSent).getTime()) < COOLDOWN_MS) {
      const retryIn = new Date(user.emailVerificationLastSent).getTime() + COOLDOWN_MS - now
      return NextResponse.json({ error: 'Cooldown active', retryIn }, { status: 429 })
    }
    if (user.emailVerificationResendCount >= MAX_RESENDS) {
      return NextResponse.json({ error: 'Max resends reached' }, { status: 429 })
    }

    const { otp, hash, expires } = createOTPRecord()
    user.emailVerificationOTP = hash
    user.emailVerificationExpires = new Date(expires)
    user.emailVerificationLastSent = new Date()
    user.emailVerificationResendCount = (user.emailVerificationResendCount || 0) + 1
    await user.save()

    await sendEmail({
      to: user.email,
      subject: 'Your Verification OTP (Resent)',
      text: `Your verification OTP is ${otp}. It expires in 10 minutes.`
    })

    return NextResponse.json({ ok: true, cooldown: COOLDOWN_MS, expiresAt: new Date(expires).toISOString() })
  } catch (e) {
    console.error('Resend OTP error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
