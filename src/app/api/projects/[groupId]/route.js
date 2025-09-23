import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import dbConnect from '@/lib/mongodb'
import ProjectGroup from '@/models/ProjectGroup'
import { ROLES } from '@/lib/roles'

export async function GET(_req, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if(!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await dbConnect()
    const project = await ProjectGroup.findOne({ groupId: params.groupId })
      .populate('leader', 'academicInfo.name email department admissionYear')
      .populate('members.student', 'academicInfo.name email department admissionYear')
      .populate('internalGuide', 'academicInfo.name email department')
    if(!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const uid = session.user.id
    const role = session.user.role
    const isMember = project.members.some(m=>String(m.student._id||m.student)===String(uid))
    const canView = role===ROLES.MAIN_ADMIN || role===ROLES.ADMIN || (role===ROLES.GUIDE && project.internalGuide && String(project.internalGuide._id||project.internalGuide)===String(uid)) || isMember
    if(!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ project })
  } catch(e){
    console.error('Project detail error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}