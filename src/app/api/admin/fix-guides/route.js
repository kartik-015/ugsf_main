import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

// One-time cleanup endpoint: reset DB, keep admin, create HODs
// DELETE THIS FILE after running once
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await dbConnect()

  // Step 1: Remove ALL users except admin@charusat.edu.in
  const deleteResult = await User.deleteMany({
    email: { $ne: 'admin@charusat.edu.in' }
  })

  // Step 2: Ensure admin is fully active
  await User.updateOne(
    { email: 'admin@charusat.edu.in' },
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

  // Step 3: Create HOD accounts with strong unique passwords
  const hods = [
    {
      email: 'dweepnagarg.ce@charusat.ac.in',
      password: 'Xk9$mR2vLpQ7#nT4',
      role: 'hod',
      department: 'IT',
      institute: 'DEPSTAR',
      university: 'CHARUSAT',
      academicInfo: { name: 'Dweepna Garg', phoneNumber: '0000000000', address: 'DEPSTAR, CHARUSAT' },
    },
    {
      email: 'amitnayak.it@charusat.ac.in',
      password: 'Wf5&jK8sZdN3@bY6',
      role: 'hod',
      department: 'CSE',
      institute: 'DEPSTAR',
      university: 'CHARUSAT',
      academicInfo: { name: 'Amit Nayak', phoneNumber: '0000000000', address: 'DEPSTAR, CHARUSAT' },
    },
    {
      email: 'chiragpatel.cse@charusat.ac.in',
      password: 'Hm7^tP4wCqR9!eU2',
      role: 'hod',
      department: 'CE',
      institute: 'DEPSTAR',
      university: 'CHARUSAT',
      academicInfo: { name: 'Chirag Patel', phoneNumber: '0000000000', address: 'DEPSTAR, CHARUSAT' },
    },
  ]

  const created = []
  for (const hod of hods) {
    // Delete if already exists (to start fresh)
    await User.deleteOne({ email: hod.email })
    const user = new User({
      ...hod,
      isOnboarded: true,
      isRegistered: true,
      isEmailVerified: true,
      isApproved: true,
      approvalStatus: 'approved',
      isActive: true,
      mustChangePassword: true,
    })
    await user.save()
    created.push({ email: hod.email, role: hod.role, department: hod.department })
  }

  // Fetch remaining users
  const allUsers = await User.find().select('email role department isRegistered isActive').lean()

  return NextResponse.json({
    deleted: deleteResult.deletedCount,
    hodsCreated: created,
    remainingUsers: allUsers.map(u => ({
      email: u.email,
      role: u.role,
      department: u.department,
      isRegistered: u.isRegistered,
      isActive: u.isActive,
    }))
  })
}
