import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@kidai/db'
import { requireParentId } from '@/lib/session'

// GET /api/alerts — parent's alert feed
export async function GET(req: NextRequest) {
  try {
    const parentId = await requireParentId()
    const url = new URL(req.url)
    const unreadOnly = url.searchParams.get('unread') === 'true'

    const alerts = await prisma.alert.findMany({
      where: {
        parentId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        child: { select: { displayName: true, avatarEmoji: true } },
        message: { select: { content: true } },
      },
    })

    const unreadCount = await prisma.alert.count({
      where: { parentId, read: false },
    })

    return NextResponse.json({ alerts, unreadCount })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// PATCH /api/alerts — mark alerts as read
export async function PATCH(req: NextRequest) {
  try {
    const parentId = await requireParentId()
    const { alertIds } = await req.json()

    if (!Array.isArray(alertIds)) {
      return NextResponse.json({ error: 'alertIds must be an array' }, { status: 400 })
    }

    await prisma.alert.updateMany({
      where: { id: { in: alertIds }, parentId },
      data: { read: true, readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
