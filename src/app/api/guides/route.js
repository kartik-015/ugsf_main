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
    const requestedGuideType = searchParams.get('guideType')

    const query = {}
    if (role) {
      query.role = role
    } else {
      // Show guides and the active project coordinator for the department
      query.role = { $in: [ROLES.GUIDE, ROLES.PROJECT_COORDINATOR] }
    }
    if (department) query.department = department
    
    console.log('📊 Guides API Query:', JSON.stringify(query, null, 2))

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'academicInfo.name': { $regex: search, $options: 'i' } }
      ]
    }

    // Internal guides are default; external guides are admin-only.
    if (requestedGuideType === 'external') {
      if (![ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(session.user.role)) {
        return NextResponse.json({ message: 'Access denied' }, { status: 403 })
      }
      query.role = ROLES.GUIDE
      query.guideType = 'external'
    } else {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { role: ROLES.PROJECT_COORDINATOR },
            { guideType: 'internal' },
            {
              $and: [
                { role: ROLES.GUIDE },
                { guideType: { $exists: false } },
                { email: { $regex: '@charusat\\.ac\\.in$', $options: 'i' } },
              ],
            },
          ],
        },
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

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    if (session.user.role !== ROLES.HOD) {
      return NextResponse.json({ message: 'Only HOD can assign or remove a project coordinator' }, { status: 403 })
    }

    await dbConnect()
    const body = await request.json().catch(() => ({}))
    const { guideId, action } = body

    if (!guideId || !action) {
      return NextResponse.json({ message: 'guideId and action are required' }, { status: 400 })
    }

    const guide = await User.findById(guideId)
    if (!guide || guide.role !== ROLES.GUIDE) {
      return NextResponse.json({ message: 'Guide not found' }, { status: 404 })
    }

    const hodDepartment = (session.user.department || '').toUpperCase()
    if (!hodDepartment || guide.department !== hodDepartment) {
      return NextResponse.json({ message: 'Guide must belong to your department' }, { status: 403 })
    }

    const activeCoordinator = await User.findOne({
      role: ROLES.PROJECT_COORDINATOR,
      department: hodDepartment,
      _id: { $ne: guide._id },
    }).select('_id email academicInfo role department')

    if (action === 'assign') {
      if (activeCoordinator) {
        return NextResponse.json({ message: `Remove current project coordinator (${activeCoordinator.academicInfo?.name || activeCoordinator.email}) first.` }, { status: 409 })
      }

      guide.role = ROLES.PROJECT_COORDINATOR
      guide.isApproved = true
      guide.approvalStatus = 'approved'
      await guide.save()

      return NextResponse.json({
        success: true,
        message: 'Project coordinator assigned successfully',
        guide: {
          _id: guide._id,
          email: guide.email,
          role: guide.role,
          department: guide.department,
          academicInfo: guide.academicInfo,
        },
      })
    }

    if (action === 'remove') {
      if (guide.role !== ROLES.PROJECT_COORDINATOR) {
        return NextResponse.json({ message: 'Selected guide is not a project coordinator' }, { status: 400 })
      }

      guide.role = ROLES.GUIDE
      await guide.save()

      return NextResponse.json({
        success: true,
        message: 'Project coordinator removed successfully',
        guide: {
          _id: guide._id,
          email: guide.email,
          role: guide.role,
          department: guide.department,
          academicInfo: guide.academicInfo,
        },
      })
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Guides PATCH error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
