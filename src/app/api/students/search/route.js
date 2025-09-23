import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

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
    const searchConditions = {
      role: 'student',
      isEmailVerified: true,
      $or: [
        { 'academicInfo.name': { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { 'academicInfo.rollNumber': { $regex: query, $options: 'i' } },
        // Add search for student ID patterns like 23dit015
        { email: { $regex: `^${query}.*@charusat\\.edu\\.in$`, $options: 'i' } }
      ]
    }
    
    // Exclude already selected members
    if (excludeList.length > 0) {
      searchConditions.email = { $nin: excludeList }
    }
    
    const students = await User.find(searchConditions)
    .select('email academicInfo.name academicInfo.rollNumber academicInfo.department academicInfo.semester academicInfo.institute')
    .limit(15) // Increased limit for better results
    .sort({ 'academicInfo.name': 1 })
    
    const formattedStudents = students.map(student => ({
      id: student._id,
      email: student.email,
      name: student.academicInfo?.name || 'Unknown',
      rollNumber: student.academicInfo?.rollNumber || '',
      department: student.academicInfo?.department || '',
      institute: student.academicInfo?.institute || '',
      semester: student.academicInfo?.semester || '',
      // Extract student ID from email for display
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