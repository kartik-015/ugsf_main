import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { parseStudentEmail, validateStudentEmail, parseGuideEmail, validateGuideEmail } from '@/lib/validation'
import { ROLES } from '@/lib/roles'
import { calculateCurrentSemester } from '@/lib/semester'
import { PROJECT_DOMAINS } from '@/lib/domains'
import { createOTPRecord } from '@/lib/otp'
import { sendEmail } from '@/lib/mailer'

const DEFAULT_PASSWORD = 'depstar@123'

export async function POST(request) {
  try {
    await dbConnect()
    const body = await request.json()
    const { email, role, name, phoneNumber, batch,
      interestedDomains } = body

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' }, 
        { status: 400 }
      )
    }

    // Validate role - only students register through this flow
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
      // Validate required student fields
      if (!name || !phoneNumber || !batch) {
        return NextResponse.json({ error: 'Name, phone number, and batch are required for student registration' }, { status: 400 })
      }
      if (!interestedDomains || !Array.isArray(interestedDomains) || interestedDomains.length === 0) {
        return NextResponse.json({ error: 'Please select at least one interested domain' }, { status: 400 })
      }
      if (interestedDomains.length > 3) {
        return NextResponse.json({ error: 'Maximum 3 interested domains allowed' }, { status: 400 })
      }
      // Validate each domain is from the allowed list (exclude 'Other' — it's only for projects)
      const validInterests = PROJECT_DOMAINS.filter(d => d !== 'Other')
      for (const d of interestedDomains) {
        if (!validInterests.includes(d)) {
          return NextResponse.json({ error: `Invalid domain: ${d}` }, { status: 400 })
        }
      }
    } else if (role === ROLES.GUIDE) {
      if (!validateGuideEmail(email)) {
        return NextResponse.json({ error: 'Invalid guide email. Required format: fullname.dit@charusat.ac.in (IT), fullname.dcs@charusat.ac.in (CSE), fullname.dce@charusat.ac.in (CE)' }, { status: 400 })
      }
      if (!name || !phoneNumber) {
        return NextResponse.json({ error: 'Name and phone number are required for guide registration' }, { status: 400 })
      }
    } else {
      const staffValid = /@charusat\.(ac|edu)\.in$/i.test(email)
      if(!staffValid) {
        return NextResponse.json({ error: 'Invalid staff email domain' }, { status:400 })
      }
    }

    // Check if user already exists and is fully registered
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser && existingUser.isRegistered && existingUser.isEmailVerified) {
      return NextResponse.json(
        { error: 'User with this email is already registered' }, 
        { status: 409 }
      )
    }

    let department, admissionYear, institute, derivedRoll, autoSemester
    if(role === ROLES.STUDENT) {
      const parsed = parseStudentEmail(email)
      if(!parsed) {
        return NextResponse.json({ error: 'Invalid student email pattern' }, { status:400 })
      }
      admissionYear = parsed.admissionYear
      department = parsed.department
      institute = parsed.institute
      derivedRoll = parsed.rollNumber
      autoSemester = calculateCurrentSemester(admissionYear)
    }

    if (role === ROLES.GUIDE) {
      const parsed = parseGuideEmail(email)
      department = parsed.department
      institute = parsed.institute
    }

    // For students and guides: require OTP verification before they can login
    const isStudent = role === ROLES.STUDENT
    const isGuide = role === ROLES.GUIDE
    const requiresOTP = isStudent || isGuide

    // Generate OTP for email verification
    let otpData = null
    if (requiresOTP) {
      otpData = createOTPRecord(10) // 10 minute expiry
    }

    if (existingUser) {
      // Student email exists in DB (pre-seeded or incomplete registration) - update with registration details
      existingUser.password = DEFAULT_PASSWORD
      existingUser.isRegistered = !requiresOTP // Completes after OTP verification
      existingUser.isOnboarded = true  // Already collecting all info during registration
      existingUser.isApproved = true
      existingUser.approvalStatus = 'approved'
      existingUser.isActive = true
      existingUser.isEmailVerified = !requiresOTP // Must verify email first
      existingUser.mustChangePassword = true
      existingUser.department = department || existingUser.department
      existingUser.admissionYear = admissionYear || existingUser.admissionYear
      existingUser.institute = institute || existingUser.institute
      existingUser.university = 'CHARUSAT'
      existingUser.academicInfo = {
        name: name || '',
        rollNumber: derivedRoll || '',
        semester: autoSemester,
        batch: batch || '',
        phoneNumber: phoneNumber || '',
      }
      existingUser.interests = interestedDomains || []

      if (requiresOTP && otpData) {
        existingUser.emailVerificationOTP = otpData.hash
        existingUser.emailVerificationExpires = new Date(otpData.expires)
        existingUser.emailVerificationLastSent = new Date()
        existingUser.emailVerificationResendCount = 1
        existingUser.emailVerificationAttemptCount = 0
      }

      await existingUser.save()

      // Send OTP email
      if (requiresOTP && otpData) {
        await sendEmail({
          to: existingUser.email,
          subject: 'EvalProX - Email Verification OTP',
          text: `Your email verification OTP is: ${otpData.otp}\n\nThis OTP expires in 10 minutes.\nDo not share this OTP with anyone.`,
          html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
            <h2 style="color:#2563eb">EvalProX - Email Verification</h2>
            <p>Your verification OTP is:</p>
            <div style="background:#f1f5f9;padding:16px;border-radius:8px;text-align:center;margin:16px 0">
              <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1e40af">${otpData.otp}</span>
            </div>
            <p style="color:#64748b;font-size:14px">This OTP expires in 10 minutes. Do not share it with anyone.</p>
          </div>`
        })

        return NextResponse.json({ 
          success: true,
          requiresVerification: true,
          message: 'OTP sent to your email. Please verify to complete registration.',
          email: existingUser.email,
        })
      }

      return NextResponse.json({ 
        success: true,
        message: 'Registration successful! Your default password is depstar@123. Please login and change your password.',
        redirectToLogin: true,
        user: {
          id: existingUser._id,
          email: existingUser.email,
          role: existingUser.role,
        }
      })
    } else {
      // New user - create fresh
      const userData = {
        email: email.toLowerCase(),
        password: DEFAULT_PASSWORD,
        role,
        guideType: role === ROLES.GUIDE ? 'internal' : undefined,
        department: department || undefined,
        admissionYear: admissionYear || undefined,
        institute: institute || undefined,
        university: 'CHARUSAT',
        academicInfo: role === ROLES.STUDENT ? {
          name: name || '',
          rollNumber: derivedRoll || '',
          semester: autoSemester,
          batch: batch || '',
          phoneNumber: phoneNumber || '',
        } : undefined,
        interests: role === ROLES.STUDENT ? (interestedDomains || []) : undefined,
        isOnboarded: true, // All roles collect info during registration, no onboarding step needed
        isRegistered: !requiresOTP, // Students & guides complete registration after OTP
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        isEmailVerified: !requiresOTP, // Students & guides must verify email first
        mustChangePassword: true,
      }

      if (requiresOTP && otpData) {
        userData.emailVerificationOTP = otpData.hash
        userData.emailVerificationExpires = new Date(otpData.expires)
        userData.emailVerificationLastSent = new Date()
        userData.emailVerificationResendCount = 1
        userData.emailVerificationAttemptCount = 0
      }

      const user = new User(userData)
      await user.save()

      // Send OTP email
      if (requiresOTP && otpData) {
        await sendEmail({
          to: user.email,
          subject: 'EvalProX - Email Verification OTP',
          text: `Your email verification OTP is: ${otpData.otp}\n\nThis OTP expires in 10 minutes.\nDo not share this OTP with anyone.`,
          html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
            <h2 style="color:#2563eb">EvalProX - Email Verification</h2>
            <p>Your verification OTP is:</p>
            <div style="background:#f1f5f9;padding:16px;border-radius:8px;text-align:center;margin:16px 0">
              <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1e40af">${otpData.otp}</span>
            </div>
            <p style="color:#64748b;font-size:14px">This OTP expires in 10 minutes. Do not share it with anyone.</p>
          </div>`
        })

        return NextResponse.json({ 
          success: true,
          requiresVerification: true,
          message: 'OTP sent to your email. Please verify to complete registration.',
          email: user.email,
        })
      }

      return NextResponse.json({ 
        success: true,
        message: 'Registration successful! Your default password is depstar@123. Please login and change your password.',
        redirectToLogin: true,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
        }
      })
    }

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
