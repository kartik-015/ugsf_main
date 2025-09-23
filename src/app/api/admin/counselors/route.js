import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function GET(request) {
  try {
    await dbConnect()
    
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  // Return academic staff (guide + hod) for admin UI
  const counselors = await User.find({ role: { $in: ['guide','hod'] } })
      .select('-password')
      .sort({ createdAt: -1 })

    return NextResponse.json({ 
      counselors,
      success: true 
    })

  } catch (error) {
    console.error('Error fetching counselors:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message }, 
      { status: 500 }
    )
  }
}
