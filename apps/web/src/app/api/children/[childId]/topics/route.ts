import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@kidai/db'
import { requireParentId } from '@/lib/session'
import type { TopicCategory } from '@kidai/shared'

const updateTopicsSchema = z.object({
  category: z.string(),
  isBlocked: z.boolean(),
  customKeywords: z.array(z.string()).optional(),
})

// GET /api/children/[childId]/topics
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const parentId = await requireParentId()
    const { childId } = await params

    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId },
      include: { topicRestrictions: true },
    })

    if (!child) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ topics: child.topicRestrictions })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// PUT /api/children/[childId]/topics — upsert a topic restriction
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const parentId = await requireParentId()
    const { childId } = await params
    const body = await req.json()
    const data = updateTopicsSchema.parse(body)

    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId },
    })

    if (!child) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const restriction = await prisma.topicRestriction.upsert({
      where: {
        childId_category: {
          childId,
          category: data.category as TopicCategory,
        },
      },
      create: {
        childId,
        category: data.category as TopicCategory,
        isBlocked: data.isBlocked,
        customKeywords: data.customKeywords ?? [],
      },
      update: {
        isBlocked: data.isBlocked,
        ...(data.customKeywords !== undefined ? { customKeywords: data.customKeywords } : {}),
      },
    })

    return NextResponse.json({ restriction })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
