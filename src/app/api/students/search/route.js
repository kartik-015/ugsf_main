import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { escapeRegExp, sanitizeString } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const excludeEmails = searchParams.get('exclude') // Comma-separated list of emails to exclude
    
    if (!query || query.length < 2) {
      return NextResponse.json({ students: [] })
    }
    
    // Parse excluded emails
    const excludeList = excludeEmails ? excludeEmails.split(',').map(email => email.trim()) : []
    
    // Enhanced search: name, email, student ID, and roll number
    const safeQuery = escapeRegExp(sanitizeString(query))
    const searchConditions = {
      role: 'student',
      isEmailVerified: true,
      $or: [
        { 'academicInfo.name': { $regex: safeQuery, $options: 'i' } },
        { email: { $regex: safeQuery, $options: 'i' } },
        { 'academicInfo.rollNumber': { $regex: safeQuery, $options: 'i' } },
        { email: { $regex: `^${safeQuery}.*@charusat\\.edu\\.in$`, $options: 'i' } }
      ]
    }
    
    // Exclude already selected members
    if (excludeList.length > 0) {
      searchConditions.email = { $nin: excludeList }
    }
    
    const students = await User.find(searchConditions)
    .select('email academicInfo.name academicInfo.rollNumber academicInfo.department academicInfo.semester academicInfo.institute interests department')
    .limit(15)
    .sort({ 'academicInfo.name': 1 })
    
    const formattedStudents = students.map(student => ({
      _id: student._id,
      email: student.email,
      name: student.academicInfo?.name || 'Unknown',
      academicInfo: student.academicInfo,
      rollNumber: student.academicInfo?.rollNumber || '',
      department: student.department || student.academicInfo?.department || '',
      semester: student.academicInfo?.semester || '',
      interests: student.interests || [],
      studentId: student.email.split('@')[0] || ''
    }))
    
    return NextResponse.json({ students: formattedStudents })
  } catch (error) {
    console.error('Student search error:', error)
    return NextResponse.json(
      { error: { message: 'Failed to search students' } },
      { status: 500 }
    )
  }
}