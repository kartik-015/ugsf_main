import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import dbConnect from '@/lib/mongodb'
import ProjectGroup from '@/models/ProjectGroup'
import User from '@/models/User'
import { ROLES } from '@/lib/roles'

// Guide allocation summary per department (HOD/Admin/Main Admin)
export async function GET(request){
  try {
    const session = await getServerSession(authOptions)
    if(!session) return NextResponse.json({ ok:false, error:'Unauthorized' }, { status:401 })
    if(![ROLES.HOD, ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(session.user.role)) {
      return NextResponse.json({ ok:false, error:'Forbidden' }, { status:403 })
    }
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')?.toUpperCase()
    const filter = {}
    if(session.user.role === ROLES.HOD) {
      filter.department = session.user.department?.toUpperCase()
    } else if(department) {
      filter.department = department
    }
    const projects = await ProjectGroup.find(filter).select('department internalGuide')
    const guideIds = [...new Set(projects.filter(p=>p.internalGuide).map(p=>String(p.internalGuide)))]
    const guides = await User.find({ _id: { $in: guideIds } }).select('academicInfo.name email department')
    const counts = {}
    projects.forEach(p=>{
      if(p.internalGuide){
        const key = String(p.internalGuide)
        counts[key] = (counts[key]||0)+1
      }
    })
    const summary = guides.map(g=>({
      guideId: g._id,
      name: g.academicInfo?.name || g.email,
      email: g.email,
      department: g.department,
      groups: counts[String(g._id)] || 0
    }))
    return NextResponse.json({ ok:true, summary })
  } catch (e) {
    console.error('Guide summary error', e)
    return NextResponse.json({ ok:false, error:'Internal server error' }, { status:500 })
  }
}