import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@kidai/db'
import { requireParentId } from '@/lib/session'
import { generateChildPin } from '@kidai/shared'

// POST /api/children/[childId]/reset-pin
// Generates a new PIN, hashes and stores it, returns the plain PIN once
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const parentId = await requireParentId()
    const { childId } = await params

    // Verify ownership
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId },
      select: { id: true, displayName: true },
    })

    if (!child) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const pin = generateChildPin()
    const pinHash = await bcrypt.hash(pin, 10)

    await prisma.childProfile.update({
      where: { id: childId },
      data: { pinHash },
    })

    return NextResponse.json({ pin })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
