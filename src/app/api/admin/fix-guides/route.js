import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

// Temporary endpoint to fix guide/admin isRegistered flags in production
// DELETE THIS FILE after running once
export async function GET(request) {
  // Simple secret key guard so random people can't call this
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await dbConnect()

  const result = await User.updateMany(
    {
      role: { $in: ['guide', 'admin', 'hod', 'principal', 'pc'] },
      $or: [
        { isRegistered: false },
        { isRegistered: { $exists: false } },
        { isApproved: false },
        { isActive: false },
      ]
    },
    {
      $set: {
        isRegistered: true,
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        isEmailVerified: true,
        isOnboarded: true,
      }
    }
  )

  const guides = await User.find({ role: 'guide' }).select('email isRegistered isApproved isActive approvalStatus')

  return NextResponse.json({
    fixed: result.modifiedCount,
    matched: result.matchedCount,
    guides: guides.map(g => ({
      email: g.email,
      isRegistered: g.isRegistered,
      isApproved: g.isApproved,
      isActive: g.isActive,
      approvalStatus: g.approvalStatus,
    }))
  })
}
