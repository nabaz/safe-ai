import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@kidai/db'
import { requireParentId } from '@/lib/session'

const updateSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  description: z.string().max(200).trim().optional(),
  isActive: z.boolean().optional(),
})

// PATCH /api/children/[childId]/custom-topics/[topicId] — toggle or rename
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string; topicId: string }> }
) {
  try {
    const parentId = await requireParentId()
    const { childId, topicId } = await params
    const body = await req.json()
    const data = updateSchema.parse(body)

    // Verify ownership via child
    const topic = await prisma.customTopic.findFirst({
      where: { id: topicId, childId, child: { parentId } },
    })
    if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.customTopic.update({
      where: { id: topicId },
      data,
    })

    return NextResponse.json({ topic: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// DELETE /api/children/[childId]/custom-topics/[topicId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string; topicId: string }> }
) {
  try {
    const parentId = await requireParentId()
    const { childId, topicId } = await params

    const topic = await prisma.customTopic.findFirst({
      where: { id: topicId, childId, child: { parentId } },
    })
    if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.customTopic.delete({ where: { id: topicId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
