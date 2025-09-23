import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { ROLES } from '@/lib/roles'
import { validateName, validatePhone, validateRollNumber, parseStudentEmail, validateSemicolonList } from '@/lib/validation'

export async function POST(request) {
  try {
    await dbConnect()
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }

  const body = await request.json()
    const {
      name,
      phoneNumber,
      address,
      department,
    university,
    institute,
      admissionYear,
      semester,
  batch,
      rollNumber,
      interests,
      experience,
      domain,
      specialization,
      education
    } = body

    // Role-based validation
    const role = session.user.role
  const isStudent = role === ROLES.STUDENT
  const isStaff = [ROLES.GUIDE, ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(role)
    const missingCommon = !name || !phoneNumber || !address || !department || !university || !institute
    if (missingCommon) {
      return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Name, phone number, address and department are required' } }, { status: 400 })
    }

    // Field-level validation
    if(!validateName(name)) {
      return NextResponse.json({ ok:false, error:{ code:'BAD_REQUEST', message:'Invalid name format'}}, { status:400 })
    }
    if(!validatePhone(phoneNumber)) {
      return NextResponse.json({ ok:false, error:{ code:'BAD_REQUEST', message:'Invalid phone number: must start with +91 and contain 12 characters total'}}, { status:400 })
    }
    if (isStudent) {
      // Derive from email, ensure consistency
      const parsed = parseStudentEmail(session.user.email)
      if(!parsed) {
        return NextResponse.json({ ok:false, error:{ code:'BAD_REQUEST', message:'Student email not in required format'}}, { status:400 })
      }
      if(!semester || !batch) {
        return NextResponse.json({ ok:false, error:{ code:'BAD_REQUEST', message:'Semester and batch required' } }, { status:400 })
      }
    } else if (isStaff) {
      if (!specialization || !education) {
        return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Specialization and education are required for staff' } }, { status: 400 })
      }
    }

    // Update user with academic info
    const parsed = isStudent ? parseStudentEmail(session.user.email) : null

    // Interests & experience semicolon enforcement if strings provided
    let interestsArray = interests
    if (typeof interests === 'string') {
      const v = validateSemicolonList(interests)
      if(!v.ok) return NextResponse.json({ ok:false, error:{ code:'BAD_REQUEST', message:v.error } }, { status:400 })
      interestsArray = v.values
    }
    let experienceText = experience
    if (typeof experience === 'string' && /[,|]/.test(experience)) {
      return NextResponse.json({ ok:false, error:{ code:'BAD_REQUEST', message:'Use semicolons (;) as separator in experience field if listing multiple entries' } }, { status:400 })
    }
    // Ensure semester is a number for students
    const semesterNumber = isStudent ? parseInt(semester, 10) : undefined
    
    const updateDoc = {
      academicInfo: {
        name,
        phoneNumber,
        address,
        semester: semesterNumber,
        batch: isStudent ? batch : undefined,
        rollNumber: isStudent ? parsed.rollNumber : undefined
      },
      department: isStudent ? parsed.department : department,
      university: isStudent ? (university || 'CHARUSAT') : university,
      institute: isStudent ? parsed.institute : institute,
      admissionYear: isStudent ? parsed.admissionYear : admissionYear,
      domain: domain || undefined,
      specialization: specialization || undefined,
      education: education || undefined,
  interests: Array.isArray(interestsArray) ? interestsArray : (interestsArray ? [interestsArray] : []),
  experience: experienceText || '',
      isOnboarded: true
    }
    
    // Debug logging to see what's being saved
    console.log('Saving semester data:', {
      isStudent,
      originalSemester: semester,
      semesterNumber,
      semesterType: typeof semesterNumber,
      updateDocSemester: updateDoc.academicInfo.semester,
      parsedInstitute: parsed?.institute,
      parsedDepartment: parsed?.department
    })
    
    const updatedUser = await User.findByIdAndUpdate(session.user.id, updateDoc, { new: true, runValidators: true })

    if (!updatedUser) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 })
    }

    const res = NextResponse.json({ 
      ok: true,
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        role: updatedUser.role,
        academicInfo: updatedUser.academicInfo,
        department: updatedUser.department,
        admissionYear: updatedUser.admissionYear,
        interests: updatedUser.interests,
        experience: updatedUser.experience
      }
    })
    // Set onboarding completion cookie (value = user id) so middleware can allow immediate redirect before JWT refresh
    try {
      res.cookies.set('onboarded', updatedUser._id.toString(), { path: '/', maxAge: 60 * 60 * 24 * 30 })
    } catch {}
    return res

  } catch (error) {
    console.error('Error updating user profile:', error)
  return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}