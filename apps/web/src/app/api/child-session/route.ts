import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@kidai/db'
import { createChildSessionToken, CHILD_COOKIE_NAME } from '@/lib/session'

const loginSchema = z.object({
  pin: z.string().min(4).max(10),
  childId: z.string(),
})

// POST /api/child-session — child logs in with PIN
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pin, childId } = loginSchema.parse(body)

    const child = await prisma.childProfile.findUnique({
      where: { id: childId },
      select: {
        id: true,
        parentId: true,
        displayName: true,
        ageTier: true,
        pinHash: true,
        isPaused: true,
      },
    })

    if (!child) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    const pinMatch = await bcrypt.compare(pin, child.pinHash)
    if (!pinMatch) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    const token = createChildSessionToken({
      childId: child.id,
      parentId: child.parentId,
      tier: child.ageTier,
      displayName: child.displayName,
    })

    const response = NextResponse.json({
      success: true,
      child: {
        id: child.id,
        displayName: child.displayName,
        ageTier: child.ageTier,
        isPaused: child.isPaused,
      },
    })

    response.cookies.set(CHILD_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60, // 12 hours
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE /api/child-session — child logs out
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(CHILD_COOKIE_NAME)
  return response
}
