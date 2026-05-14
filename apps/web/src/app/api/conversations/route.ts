import { NextResponse } from 'next/server'
import { prisma } from '@kidai/db'
import { requireParentId } from '@/lib/session'

// GET /api/conversations?childId=xxx — get conversations for a child (parent view)
export async function GET(req: Request) {
  try {
    const parentId = await requireParentId()
    const url = new URL(req.url)
    const childId = url.searchParams.get('childId')

    if (!childId) {
      return NextResponse.json({ error: 'childId required' }, { status: 400 })
    }

    // Verify ownership
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId },
    })

    if (!child) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const conversations = await prisma.conversation.findMany({
      where: { childId },
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, inputFlagged: true, outputFlagged: true },
        },
      },
    })

    return NextResponse.json({ conversations })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
