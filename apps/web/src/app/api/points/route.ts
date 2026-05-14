import { NextResponse } from 'next/server'
import { getChildSession } from '@/lib/session'
import { getChildStats } from '@/lib/points'

// GET /api/points — get child's XP, level, and recent history
export async function GET() {
  const session = await getChildSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stats = await getChildStats(session.childId)
  return NextResponse.json(stats)
}
