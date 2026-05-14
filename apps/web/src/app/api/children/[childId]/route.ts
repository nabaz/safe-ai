import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@kidai/db'
import { requireParentId } from '@/lib/session'

const updateChildSchema = z.object({
  displayName: z.string().min(1).max(30).optional(),
  isPaused: z.boolean().optional(),
  dailyLimitMinutes: z.number().int().min(5).max(480).optional(),
  blackoutStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  blackoutEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  avatarEmoji: z.string().optional(),
})

// PATCH /api/children/[childId] — update child settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const parentId = await requireParentId()
    const { childId } = await params
    const body = await req.json()
    const data = updateChildSchema.parse(body)

    // Verify this child belongs to this parent
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId },
    })

    if (!child) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.childProfile.update({
      where: { id: childId },
      data,
      select: {
        id: true,
        displayName: true,
        ageTier: true,
        avatarEmoji: true,
        isPaused: true,
        dailyLimitMinutes: true,
        blackoutStart: true,
        blackoutEnd: true,
      },
    })

    return NextResponse.json({ child: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// DELETE /api/children/[childId] — delete child + all data (COPPA right to deletion)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const parentId = await requireParentId()
    const { childId } = await params

    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId },
    })

    if (!child) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Cascade delete via schema (conversations → messages → alerts)
    await prisma.childProfile.delete({ where: { id: childId } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
