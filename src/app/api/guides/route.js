import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { ROLES, ADMIN_ROLES } from '@/lib/roles'

export const dynamic = 'force-dynamic'

// Unified Guides directory API (replaces former faculty endpoint)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('🔐 Guides API called by:', session?.user?.email, 'Role:', session?.user?.role)
    
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    // Access: admin management + hod + project_coordinator
    if (![...ADMIN_ROLES, ROLES.HOD, ROLES.PROJECT_COORDINATOR].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    await dbConnect()
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department') || ((session.user.role === ROLES.HOD || session.user.role === ROLES.PROJECT_COORDINATOR) ? session.user.department : null)
    const role = searchParams.get('role')
    const search = searchParams.get('search')

    const query = {}
    if (role) {
      query.role = role
    } else {
      // Show only guides (not HODs) for guide assignment
      query.role = ROLES.GUIDE
    }
    if (department) query.department = department
    
    console.log('📊 Guides API Query:', JSON.stringify(query, null, 2))

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'academicInfo.name': { $regex: search, $options: 'i' } }
      ]
    }

    // Non top-level admins see only active
    if (![ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(session.user.role)) {
      query.isActive = true
    }

    const guides = await User.find(query)
      .select('email academicInfo department role specialization researchAreas interests isApproved university institute isActive')
      .sort({ department: 1, 'academicInfo.name': 1 })
    
    console.log(`Found ${guides.length} guides/HODs`)
    
    return NextResponse.json({ guides })
  } catch (error) {
    console.error('Guides GET error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
