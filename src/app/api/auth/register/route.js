import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { parseStudentEmail, validateStudentEmail } from '@/lib/validation'
import { ROLES } from '@/lib/roles'
import { calculateCurrentSemester } from '@/lib/semester'
import { PROJECT_DOMAINS } from '@/lib/domains'

const DEFAULT_PASSWORD = 'depstar@123'

export async function POST(request) {
  try {
    await dbConnect()
    const body = await request.json()
    const { email, role, name, phoneNumber, address, batch,
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
      if (!name || !phoneNumber || !address || !batch) {
        return NextResponse.json({ error: 'Name, phone number, address, and batch are required for student registration' }, { status: 400 })
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
    } else {
      const staffValid = /@charusat\.(ac|edu)\.in$/i.test(email)
      if(!staffValid) {
        return NextResponse.json({ error: 'Invalid staff email domain' }, { status:400 })
      }
    }

    // Check if user already exists and is fully registered
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser && existingUser.isRegistered) {
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

    if (existingUser) {
      // Student email exists in DB (pre-seeded) - update with registration details
      existingUser.password = DEFAULT_PASSWORD
      existingUser.isRegistered = true
      existingUser.isOnboarded = true  // Already collecting all info during registration
      existingUser.isApproved = true
      existingUser.approvalStatus = 'approved'
      existingUser.isActive = true
      existingUser.isEmailVerified = true
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
        address: address || '',
      }
      existingUser.interests = interestedDomains || []
      await existingUser.save()

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
      const user = new User({
        email: email.toLowerCase(),
        password: DEFAULT_PASSWORD,
        role,
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
          address: address || '',
        } : undefined,
        interests: role === ROLES.STUDENT ? (interestedDomains || []) : undefined,
        isOnboarded: role === ROLES.STUDENT ? true : false,
        isRegistered: true,
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: true,
      })

      await user.save()

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
