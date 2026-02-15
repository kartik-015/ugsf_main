import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import PrincipalChat from '@/models/PrincipalChat'
import User from '@/models/User'
import { ROLES } from '@/lib/roles'

export const dynamic = 'force-dynamic'

// GET /api/principal-chat?mode=page&page=/dashboard/projects
// Admin: list all pages with latest message if no page provided (mode=pages)
export async function GET(request){
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)
    if(!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page')
    const mode = searchParams.get('mode') || 'page'
    const isPrincipal = session.user.role === ROLES.PRINCIPAL
    const isAdmin = [ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(session.user.role)

    if(mode === 'pages'){
      if(!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const agg = await PrincipalChat.aggregate([
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$page', lastMessage: { $first: '$message' }, lastAt: { $first: '$createdAt' } } },
        { $sort: { lastAt: -1 } }
      ])
      return NextResponse.json({ pages: agg })
    }

    if(!page) return NextResponse.json({ error: 'page param required' }, { status: 400 })
    const filter = { page }
    if(isPrincipal){
      filter.from = session.user.id // only own conversation messages (outbound) + any admin replies to principal
      // Actually principal needs to see both directions: adjust logic: messages where (from=principalUser OR to=principalUser)
      delete filter.from
      filter.$or = [ { from: session.user.id }, { to: session.user.id } ]
    }
    const msgs = await PrincipalChat.find(filter).sort({ createdAt: 1 }).limit(500).populate('from','email academicInfo.name role').populate('to','email role')
    return NextResponse.json({ messages: msgs })
  } catch(e){
    console.error('Principal chat GET error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST { page, pageTitle, message, replyToUserId? }
export async function POST(request){
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)
    if(!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(()=> ({}))
    const { page, pageTitle, message, toUserId } = body
    if(!page || !message) return NextResponse.json({ error: 'Missing page or message' }, { status: 400 })
    const role = session.user.role
    if(role === ROLES.PRINCIPAL){
      // principal can only send to an admin (pick a primary admin or mainadmin). If toUserId provided ensure admin.
      let adminUser = null
      if(toUserId){
        adminUser = await User.findById(toUserId)
        if(!adminUser || ![ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(adminUser.role)) return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
      } else {
        adminUser = await User.findOne({ role: ROLES.MAIN_ADMIN }) || await User.findOne({ role: ROLES.ADMIN })
        if(!adminUser) return NextResponse.json({ error: 'No admin available' }, { status: 500 })
      }
      const doc = await PrincipalChat.create({ from: session.user.id, to: adminUser._id, roleFrom: 'principal', page, pageTitle, message })
      if(global.io){
        global.io.to(`user-${adminUser._id}`).emit('principal:message', { page, message: doc.message, from: session.user.id, id: doc._id, at: doc.createdAt })
      }
      return NextResponse.json({ ok: true, message: doc })
    }
    // Admin replying to principal -> require toUserId (principal's id)
    if([ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(role)){
      if(!toUserId) return NextResponse.json({ error: 'toUserId required for admin reply' }, { status: 400 })
      const principalUser = await User.findById(toUserId)
      if(!principalUser || principalUser.role !== ROLES.PRINCIPAL) return NextResponse.json({ error: 'Invalid principal user' }, { status: 400 })
      const doc = await PrincipalChat.create({ from: session.user.id, to: principalUser._id, roleFrom: role === ROLES.MAIN_ADMIN ? 'mainadmin':'admin', page, pageTitle, message })
      if(global.io){
        global.io.to(`user-${principalUser._id}`).emit('admin:reply', { page, message: doc.message, from: session.user.id, id: doc._id, at: doc.createdAt })
      }
      return NextResponse.json({ ok: true, message: doc })
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch(e){
    console.error('Principal chat POST error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
