import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@kidai/db'
import { requireParentId } from '@/lib/session'

const createSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  description: z.string().max(200).trim().optional(),
})

// GET /api/children/[childId]/custom-topics
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const parentId = await requireParentId()
    const { childId } = await params

    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId },
    })
    if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const topics = await prisma.customTopic.findMany({
      where: { childId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ topics })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST /api/children/[childId]/custom-topics
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const parentId = await requireParentId()
    const { childId } = await params
    const body = await req.json()
    const data = createSchema.parse(body)

    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId },
    })
    if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Limit to 20 custom topics per child
    const count = await prisma.customTopic.count({ where: { childId } })
    if (count >= 20) {
      return NextResponse.json({ error: 'Maximum of 20 custom topics per child' }, { status: 400 })
    }

    const topic = await prisma.customTopic.create({
      data: { childId, name: data.name, description: data.description },
    })

    return NextResponse.json({ topic }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
