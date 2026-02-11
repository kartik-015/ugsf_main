import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import dbConnect from '@/lib/mongodb'
import Notification from '@/models/Notification'

export const dynamic = 'force-dynamic'

// GET notifications for the logged-in user
export async function GET(request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ notifications: [] }, { status: 401 })

  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const filter = { recipient: session.user.id }
    if (unreadOnly) filter.isRead = false

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const unreadCount = await Notification.countDocuments({ recipient: session.user.id, isRead: false })

    return NextResponse.json({ notifications, unreadCount })
  } catch (e) {
    console.error('Notifications GET error:', e)
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 500 })
  }
}

// PATCH - mark notifications as read
export async function PATCH(request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const body = await request.json()
    const { notificationId, markAllRead } = body

    if (markAllRead) {
      await Notification.updateMany(
        { recipient: session.user.id, isRead: false },
        { isRead: true, readAt: new Date() }
      )
      return NextResponse.json({ ok: true, message: 'All notifications marked as read' })
    }

    if (notificationId) {
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: session.user.id },
        { isRead: true, readAt: new Date() }
      )
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (e) {
    console.error('Notifications PATCH error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
