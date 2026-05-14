import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@kidai/db'
import { requireParentId } from '@/lib/session'
import { getAgeTierFromDOB, generateChildPin } from '@kidai/shared'

const createChildSchema = z.object({
  displayName: z.string().min(1).max(30),
  dateOfBirth: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  avatarEmoji: z.string().optional().default('🦊'),
  dailyLimitMinutes: z.number().int().min(5).max(480).optional().default(60),
})

// GET /api/children — list parent's children
export async function GET() {
  try {
    const parentId = await requireParentId()

    const children = await prisma.childProfile.findMany({
      where: { parentId },
      select: {
        id: true,
        displayName: true,
        dateOfBirth: true,
        ageTier: true,
        avatarEmoji: true,
        isPaused: true,
        dailyLimitMinutes: true,
        blackoutStart: true,
        blackoutEnd: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ children })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST /api/children — create a new child profile
export async function POST(req: NextRequest) {
  try {
    const parentId = await requireParentId()
    const body = await req.json()
    const data = createChildSchema.parse(body)

    const dob = new Date(data.dateOfBirth)
    const ageTier = getAgeTierFromDOB(dob)

    // Generate a PIN and hash it
    const pin = generateChildPin()
    const pinHash = await bcrypt.hash(pin, 10)

    const child = await prisma.childProfile.create({
      data: {
        parentId,
        displayName: data.displayName,
        dateOfBirth: dob,
        ageTier,
        avatarEmoji: data.avatarEmoji,
        dailyLimitMinutes: data.dailyLimitMinutes,
        pinHash,
      },
      select: {
        id: true,
        displayName: true,
        ageTier: true,
        avatarEmoji: true,
      },
    })

    // Return the plain PIN once — parent must share it with the child
    // After this, it's only stored as a hash
    return NextResponse.json({ child, pin }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 })
    }
    console.error('[create-child]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
