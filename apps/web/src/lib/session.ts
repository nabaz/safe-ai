import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import type { ChildSessionPayload } from '@kidai/shared'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const CHILD_SESSION_SECRET = process.env.CHILD_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-secret'
const CHILD_COOKIE_NAME = 'kidai_child_session'

/**
 * Get the parent session from NextAuth (server-side)
 */
export async function getParentSession() {
  return getServerSession(authOptions)
}

/**
 * Get the authenticated parent ID or throw
 */
export async function requireParentId(): Promise<string> {
  const session = await getParentSession()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  return session.user.id
}

/**
 * Create a signed JWT for a child session, set as an HttpOnly cookie
 */
export function createChildSessionToken(payload: ChildSessionPayload): string {
  return jwt.sign(payload, CHILD_SESSION_SECRET, { expiresIn: '12h' })
}

/**
 * Verify and decode a child session token
 */
export function verifyChildSessionToken(token: string): ChildSessionPayload | null {
  try {
    return jwt.verify(token, CHILD_SESSION_SECRET) as ChildSessionPayload
  } catch {
    return null
  }
}

/**
 * Get child session from cookies (server-side)
 */
export async function getChildSession(): Promise<ChildSessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(CHILD_COOKIE_NAME)?.value
  if (!token) return null
  return verifyChildSessionToken(token)
}

export { CHILD_COOKIE_NAME }
