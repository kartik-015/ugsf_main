import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import ProjectGroup from '@/models/ProjectGroup'
import { canViewProject } from '@/lib/projectAccess'

export async function GET(_req, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if(!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await dbConnect()
    const project = await ProjectGroup.findOne({ groupId: params.groupId })
      .populate('leader', 'academicInfo.name email department admissionYear')
      .populate('members.student', 'academicInfo.name email department admissionYear')
      .populate('internalGuide', 'academicInfo.name email department')
      .populate('externalGuide.user', 'academicInfo.name email department role')
    if(!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const canView = canViewProject(project, session.user)
    if(!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ project })
  } catch(e){
    console.error('Project detail error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}