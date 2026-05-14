import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@kidai/db'
import { requireParentId } from '@/lib/session'

// GET /api/conversations/[id] — full message log (parent view)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const parentId = await requireParentId()
    const { conversationId } = await params

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        child: { parentId },
      },
      include: {
        child: { select: { displayName: true, ageTier: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            inputFlagged: true,
            outputFlagged: true,
            flagReason: true,
            moderationScore: true,
            createdAt: true,
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ conversation })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
