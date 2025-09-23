import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import dbConnect from '@/lib/mongodb'
import ProjectGroup from '@/models/ProjectGroup'
import User from '@/models/User'
import { ROLES } from '@/lib/roles'

// GET /api/projects/group-details?groupId=...&memberId=optional
export async function GET(request){
  try {
    const session = await getServerSession(authOptions)
    if(!session) return NextResponse.json({ ok:false, error:'Unauthorized' }, { status:401 })
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const memberId = searchParams.get('memberId')
    if(!groupId) return NextResponse.json({ ok:false, error:'groupId required' }, { status:400 })
    const group = await ProjectGroup.findOne({ groupId })
      .populate('leader', 'academicInfo name email department admissionYear institute university role')
      .populate('members.student', 'academicInfo email department admissionYear institute university role')
      .populate('internalGuide', 'academicInfo email department role')
    if(!group) return NextResponse.json({ ok:false, error:'Not found' }, { status:404 })
    const uid = session.user.id
    const role = session.user.role
    const isMember = group.members.some(m=>String(m.student._id||m.student)===String(uid))
    const canView = [ROLES.MAIN_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.HOD].includes(role) || isMember || (role===ROLES.GUIDE && group.internalGuide && String(group.internalGuide._id||group.internalGuide)===String(uid))
    if(!canView) return NextResponse.json({ ok:false, error:'Forbidden' }, { status:403 })
    if(memberId){
      const member = await User.findById(memberId).select('-password')
      if(!member) return NextResponse.json({ ok:false, error:'Member not found' }, { status:404 })
      return NextResponse.json({ ok:true, member })
    }
    return NextResponse.json({ ok:true, group })
  } catch (e) {
    console.error('Group details error', e)
    return NextResponse.json({ ok:false, error:'Internal server error' }, { status:500 })
  }
}