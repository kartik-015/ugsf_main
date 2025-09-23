import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { parseStudentEmail, validateStudentEmail } from '@/lib/validation'
import { createOTPRecord } from '@/lib/otp'
import { sendEmail } from '@/lib/mailer'
import { ROLES } from '@/lib/roles'

export async function POST(request) {
  try {
    await dbConnect()
    const body = await request.json()
  const { email, password, role } = body

    // Validate required fields
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'All fields are required' }, 
        { status: 400 }
      )
    }

    // Validate role
  const allowed = [ROLES.STUDENT, ROLES.GUIDE, ROLES.ADMIN]
  if (!allowed.includes(role)) {
      return NextResponse.json(
    { error: 'Invalid role' }, 
        { status: 400 }
      )
    }

    if (role === ROLES.STUDENT) {
      if(!validateStudentEmail(email)) {
        return NextResponse.json({ error: 'Invalid student email format. Expected: yydeprol@charusat.edu.in' }, { status:400 })
      }
    } else {
      const staffValid = /@charusat\.(ac|edu)\.in$/i.test(email)
      if(!staffValid) {
        return NextResponse.json({ error: 'Invalid staff email domain' }, { status:400 })
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' }, 
        { status: 409 }
      )
    }

    let department, admissionYear, institute, derivedRoll
    if(role === ROLES.STUDENT) {
      const parsed = parseStudentEmail(email)
      if(!parsed) {
        return NextResponse.json({ error: 'Invalid student email pattern' }, { status:400 })
      }
      admissionYear = parsed.admissionYear
      department = parsed.department
      institute = parsed.institute
      derivedRoll = parsed.rollNumber
    }

    // Create new user
  const requiresApproval = [ROLES.GUIDE, ROLES.ADMIN].includes(role)
  const { otp, hash, expires } = createOTPRecord()
    const user = new User({
      email: email.toLowerCase(),
      password,
      role,
  department: department || undefined,
  admissionYear: admissionYear || undefined,
  institute: institute || undefined,
  academicInfo: derivedRoll ? { rollNumber: derivedRoll } : undefined,
      isOnboarded: false,
      isRegistered: true,
      isApproved: !requiresApproval,
      approvalStatus: requiresApproval ? 'pending' : 'approved',
      isActive: !requiresApproval,
      emailVerificationOTP: hash,
      emailVerificationExpires: new Date(expires),
      isEmailVerified: false
    })

    await user.save()

    // Send OTP email (mock)
    await sendEmail({
      to: user.email,
      subject: 'Your Verification OTP',
      text: `Your verification OTP is ${otp}. It expires in 10 minutes.`
    })
    user.emailVerificationLastSent = new Date()
    user.emailVerificationResendCount = 0
    user.emailVerificationAttemptCount = 0
    await user.save()

    return NextResponse.json({ 
      success: true,
      onboardingRequired: true,
      verificationRequired: true,
      message: 'Registration successful. OTP sent to email.',
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation failed: ' + Object.values(error.errors).map(e => e.message).join(', ') },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
